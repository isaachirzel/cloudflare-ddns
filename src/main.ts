import * as fs from "fs";
import { Cloudflare } from "./cloudflare";

interface DnsEntryConfig
{
	name: string;
	ip: string | null;
}

interface ZoneConfig
{
	name: string;
	dnsEntries: DnsEntryConfig[];
}

interface Config
{
	apiToken: string;
	zones: ZoneConfig[];
}

async function getPublicIp(): Promise<string>
{
	const response  = await fetch("https://api.ipify.org/");
	const ip = await response.text();

	return ip;
}

function readConfig(path: string): Config
{
	const buffer = fs.readFileSync(path);
	const text = buffer.toString();
	const config = JSON.parse(text) as Config;

	return config;
}

async function main()
{
	const config = readConfig("./config.json");
	const publicIp = await getPublicIp();
	const api = new Cloudflare(config.apiToken);
	const zones = await api.getZones();
	let updatedZones = 0;

	for (const zoneConfig of config.zones)
	{
		const zone = zones.find(x => x.name === zoneConfig.name) ;

		if (!zone)
		{
			console.error(`No zone '${zoneConfig.name}' was found under the given account.`);
			continue;
		}

		const dnsRecords = await api.getDnsRecords(zone);

		let updatedRecords = 0;

		for (const entry of zoneConfig.dnsEntries)
		{
			const recordName = entry.name
				? `${entry.name}.${zone.name}`
				: zone.name;
			const record = dnsRecords.find(x => x.name === recordName);

			if (!record)
			{
				// TODO: Create record
				continue;
			}

			const expectedIp = entry.ip || publicIp;

			if (record.content === expectedIp)
				continue;

			console.log(`Updating DNS record '${record.name}' from ${record.content} to ${expectedIp}.`);
			
			record.content = expectedIp;

			await api.updateDnsRecordIp(record);
			updatedRecords += 1;
		}

		if (updatedRecords > 0)
		{
			console.log(`Updated ${updatedRecords} records for zone '${zone.name}'.`);

			updatedZones += 1;
		}
		else
		{
			console.log(`All records for zone '${zone.name}' are up to date.`);
		}
	}

	if (updatedZones > 0)
	{
		console.log(`Updated ${updatedZones} zones.`);
	}
	else
	{
		console.log("All zones are up to date.");
	}
}

main().catch((error: any) =>
{
	const message: string = error instanceof Error
		? error.message
		: String(error);

	console.error(message);
	process.exit(1);
});
