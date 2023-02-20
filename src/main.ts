import * as fs from "fs";
import * as os from "os";
import { Cloudflare } from "./cloudflare";

interface ZoneConfig
{
	name: string;
	dnsEntries: string[];
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

function validateExists(obj: object, key: string): void
{
	if (!obj[key])
		throw new Error(`Property '${key}' is a required field.`);
}

function validateType(obj: object, key: string, typeName: string): void
{
	if (typeof obj[key] !== typeName)
		throw new Error(`Property '${key}' must be of type ${typeName}.`);
}

function validateArray(obj: object, key: string): void
{
	if (!Array.isArray(obj[key]))
		throw new Error("Property 'dnsEntries' must be an array.");
}

function validateZoneConfig(config: any): void
{
	if (typeof config !== "object")
		throw new Error("Config is not valid.");

	validateExists(config, "name");
	validateType(config, "name", "string");
	
	validateExists(config, "dnsEntries");
	validateArray(config, "dnsEntries");
}

function validateConfig(config: any): void
{
	if (typeof config !== "object")
		throw new Error("Config is not valid.");

	validateExists(config, "apiToken");
	validateType(config, "apiToken", "string");
	validateExists(config, "zones");
	validateArray(config, "zones");

	let index = 0;

	for (const zoneConfig of config.zones)
	{
		try
		{
			validateZoneConfig(zoneConfig);
		}
		catch (e: any)
		{
			throw new Error(`zone[${index}]: ${e.message}`);
		}

		index += 1;
	}
}

function readConfig(path: string): Config
{
	try
	{
		const buffer = fs.readFileSync(path);
		const text = buffer.toString();
		const config = JSON.parse(text) as object;
	
		validateConfig(config);
	
		return config as Config;
	}
	catch (e: any)
	{
		throw new Error(`Unable to load config: ${e.message}`);
	}
}

async function main()
{
	const homeDir = os.homedir();
	const configDir = `${homeDir}/.config/cloudflare-ddns/config.json`;
	const config = readConfig(configDir);
	const publicIp = await getPublicIp();
	const api = new Cloudflare(config.apiToken);
	const zones = await api.getZones();
	let updatedZones = 0;

	for (const zoneConfig of config.zones)
	{
		const zone = zones.find(x => x.name === zoneConfig.name) ;

		if (!zone)
		{
			console.error(`${zoneConfig.name}: Zone does not exist under given account.`);
			continue;
		}

		const dnsRecords = await api.getDnsRecords(zone);

		let updatedRecords = 0;

		for (const entry of zoneConfig.dnsEntries)
		{
			const recordName = entry
				? `${entry}.${zone.name}`
				: zone.name;
			const record = dnsRecords.find(x => x.name === recordName);

			if (!record)
			{
				// TODO: Create record
				continue;
			}

			if (record.content === publicIp)
				continue;

			console.log(`${record.name}: Updating IP from ${record.content} to ${publicIp}.`);
			
			record.content = publicIp;

			await api.updateDnsRecordIp(record);

			updatedRecords += 1;
		}

		if (updatedRecords > 0)
		{
			console.log(`${zone.name}: Updated ${updatedRecords} DNS records.`);

			updatedZones += 1;
		}
		else
		{
			console.log(`${zone.name}: All DNS records are up to date.`);
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
