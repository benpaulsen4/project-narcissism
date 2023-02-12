import * as mongoDB from "mongodb";
export default class AnalyticsService {
    private userAgent?: string;
    private ip?: string;
    private location?: string;
    private dataCollection?: mongoDB.Collection;
    public initialized = false;

    async initialize(config: DbConfig){
        if (!config || !config.connection || !config.db || !config.collection){
            throw new Error("Missing/incomplete configuration!");
        }

        const client = new mongoDB.MongoClient(config.connection);
        await client.connect();
        this.dataCollection = client.db(config.db).collection(config.collection);

        const data = this.JSONify(await (await fetch("https://www.cloudflare.com/cdn-cgi/trace")).text());

        this.userAgent = data["uag"];
        this.ip = data["ip"];
        this.location = data["loc"];

        this.initialized = true;
    }

    async collect(url: string) {
        if (!this.initialized) {
            throw new Error("Not initialized!");
        }

        await this.dataCollection?.insertOne({
            date: new Date().toISOString(),
            ua: this.userAgent,
            ip: this.ip,
            location: this.location,
            page: url
        });
    }

    JSONify(data: string): any{
        return data.trim().split('\n').reduce((obj: any, pair: string) => {
            const thisPair = pair.split('=');
            obj[thisPair[0]] = thisPair[1];
            return obj;
            }, {});
    }
}

export class DbConfig {
    connection?: string;
    db?: string;
    collection?: string

    constructor(connection?: string, db?: string, collection?: string) {
        this.connection = connection;
        this.db = db;
        this.collection = collection;
    }
}