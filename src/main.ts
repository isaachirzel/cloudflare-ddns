
import * as os from "os";
import { Cloudflare, Zone } from "./cloudflare";
import { Config, ZoneConfig } from "./config";
import { Ipify } from "./ipify";

interface Client
{
	cloudflare: Cloudflare;
	ipify: Ipify;
}

function log(message: string): void
{
	console.log("DDNS Util: " + message);
}

function getConfigDir(): string
{
	const homeDir = os.homedir();
	const configDir = `${homeDir}/.config/cloudflare-ddns/config.json`;

	return configDir;
}

async function updateDnsRecords(zone: Zone, config: ZoneConfig, client: Client): Promise<boolean>
{
	const dnsRecords = await client.cloudflare.getDnsRecords(zone);
	const publicIp = await client.ipify.getPublicIp();
	let updatedRecords = 0;

	for (const entry of config.dnsEntries)
	{
		const recordName = entry
			? `${entry}.${zone.name}`
			: zone.name;
		const record = dnsRecords.find(x => x.name === recordName);

		if (!record) // TODO: Create record
			continue;

		if (record.content === publicIp)
			continue;

		log(`${record.name}: Updating IP from ${record.content} to ${publicIp}.`);
		
		record.content = publicIp;

		await client.cloudflare.updateDnsRecordIp(record);

		updatedRecords += 1;
	}

	if (updatedRecords > 0)
	{
		log(`${zone.name}: Updated ${updatedRecords} DNS records.`);
		
		return true;
	}

	return false;
}

async function updateZones(config: Config): Promise<void>
{
	const client =
	{
		cloudflare: new Cloudflare(config.apiToken),
		ipify: new Ipify()
	};
	const zones = await client.cloudflare.getZones();
	let updatedZones = 0;

	for (const zoneConfig of config.zones)
	{
		const zone = zones.find(x => x.name === zoneConfig.name) ;

		if (!zone)
		{
			log(`${zoneConfig.name}: Zone does not exist under given account.`);
			continue;
		}
		
		if (await updateDnsRecords(zone, zoneConfig, client))
			updatedZones += 1;
	}

	if (updatedZones > 0)
		log(`Updated ${updatedZones} zones.`);
}

async function main()
{
	const configDir = getConfigDir();
	const config = new Config(configDir);

	updateZones(config);
}

main().catch((error: any) =>
{
	const message: string = error instanceof Error
		? error.message
		: String(error);

	log("Failed to update DNS records: " + message);
	process.exit(1);
});
