export class ProjectData {
    name: string;
    date: string;
    description: string;
    imgUrl: string;
    links: Link[];
    tags: string[];

    constructor(name: string, date: string, description: string, imgUrl: string,
                links: Link[], tags: string[]) {
        this.name = name;
        this.date = date;
        this.description = description;
        this.imgUrl = imgUrl;
        this.links = links;
        this.tags = tags;
    }
}

export type Link = { name: string, href: string };