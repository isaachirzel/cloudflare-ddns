export class Ipify
{
	private static readonly baseUrl: string = "https://api.ipify.org";
	private publicIp?: string;

	constructor() {}

	public async getPublicIp(): Promise<string>
	{
		if (this.publicIp)	
			return this.publicIp;
		
		const response  = await fetch(Ipify.baseUrl);

		this.publicIp = await response.text();

		return this.publicIp;
	}
}
