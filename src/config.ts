import * as fs from "fs";

export class ZoneConfig
{
	name: string;
	dnsEntries: string[];

	constructor(config: any)
	{
		const obj = validateObject(config);
		const name = validateString(obj, "name");
		const entries = validateArray(obj, "dnsEntries");

		for (let i = 0; i < entries.length; ++i)
		{
			if (typeof entries[i] !== "string")
				throw new Error(`dnsEntries[${i}]: Expected string, but got '${entries[i]}'.`);
		}

		this.name = name;
		this.dnsEntries = entries;
	}
}

export class Config
{
	public readonly apiToken: string;
	public readonly zones: ZoneConfig[];

	constructor(path: string)
	{
		try
		{
			const buffer = fs.readFileSync(path);
			const text = buffer.toString();
			const config = JSON.parse(text);
			const obj = validateObject(config);
		
			if (typeof obj !== "object")
				throw new Error("Config is not valid.");

			const apiToken = validateString(obj, "apiToken");
			const zoneConfigs = validateArray(obj, "zones");
			const zones = zoneConfigs.map((zoneConfig, i) =>
			{
				try
				{
					return new ZoneConfig(zoneConfig);
				}
				catch (e: any)
				{
					throw new Error(`zone[${i}]: ${e.message}`);
				}
			});			

			this.apiToken = apiToken;
			this.zones = zones;
		}
		catch (e: any)
		{
			throw new Error(`Unable to load config: ${e.message}`);
		}
	}
}

function validateExists(obj: object, key: string): any
{
	const value = obj[key];

	if (!value)
		throw new Error(`Property '${key}' is a required field.`);

	return value;
}

function validateObject(config: any): object
{
	if (typeof config !== "object")
		throw new Error("Config is not valid.");

	return config;
}

function validateString(obj: object, key: string): string
{
	const value = validateExists(obj, key);

	if (typeof value !== "string")
		throw new Error(`Property '${key}' must be a string.`);
	
	return value;
}

function validateArray(obj: object, key: string): any[]
{
	const value = validateExists(obj, key);

	if (!Array.isArray(obj[key]))
		throw new Error("Property 'dnsEntries' must be an array.");

	return value;
}
