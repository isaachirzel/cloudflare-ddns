interface Message
{
	code: number;
	message: string;
}

export interface ApiResponse<T>
{
	success: boolean;
	messages: Message[];
	errors: Message[];
	result: T;
}

export interface Zone
{
	name: string;
	id: string;
}

export interface DnsRecord
{
	id: string;
	zone_id: string;
	zone_name: string;
	name: string;
	type: string;
	content: string;
	ttl: number;
}



type HttpMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";

export class Cloudflare
{
	private static readonly baseUrl: string = "https://api.cloudflare.com/client/v4";

	private token: string;
	private headers: any;

	constructor (token: string)
	{
		this.token = token;
		this.headers = {
			"Authorization": "Bearer " + token,
			"Content-Type": "application/json"
		};
	}

	private async request<T>(method: HttpMethod, url: string, body?: any): Promise<T>
	{
		const bodyText = body ? JSON.stringify(body) : null;
		const httpResponse = await fetch(Cloudflare.baseUrl + url,
		{
			method: method,
			headers: this.headers,
			body: bodyText
		});
		const apiResponse = await httpResponse.json() as ApiResponse<T>;

		if (!apiResponse.success)
		{
			let message = "";

			for (const error of apiResponse.errors)
			{
				message += error.message;
			}

			throw new Error("Unable to get API response: " + message);
		}

		return apiResponse.result;
	}

	public async getZone(id: string): Promise<Zone>
	{
		return this.request<Zone>("GET", `/zones/${id}`);
	}

	public async getZones(): Promise<Zone[]>
	{
		return this.request<Zone[]>("GET", "/zones");
	}

	public async getDnsRecords(zone: Zone): Promise<DnsRecord[]>
	{
		return this.request<DnsRecord[]>("GET", `/zones/${zone.id}/dns_records`);
	}

	public async updateDnsRecordIp(record: DnsRecord): Promise<any>
	{
		return this.request<any>("PATCH", `/zones/${record.zone_id}/dns_records/${record.id}`,
		{
			content: record.content
		});
	}
}
