import {initializeApp} from "firebase/app";
import {getAnalytics} from "@firebase/analytics";

export default class AnalyticsHelper{

    initialize(config: any){
        if (config){
            let app = initializeApp(config)
            return getAnalytics(app)
        }
    }
    async getEnvironment(): Promise<EnvironmentInfo>{
        const data = this.JSONify(await (await fetch("https://www.cloudflare.com/cdn-cgi/trace")).text());

        return new EnvironmentInfo(data["uag"], data["ip"], data["loc"]);
    }

    JSONify(data: string): any{
        return data.trim().split('\n').reduce((obj: any, pair: string) => {
            const thisPair = pair.split('=');
            obj[thisPair[0]] = thisPair[1];
            return obj;
            }, {});
    }
}

export class EnvironmentInfo{
    public userAgent: string;
    public ip: string;
    public location: string;

    constructor(userAgent: string, ip: string, location: string) {
        this.userAgent = userAgent;
        this.ip = ip;
        this.location = location;
    }
}