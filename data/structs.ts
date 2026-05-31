export class ProjectData {
  name: string;
  date: string;
  description: string;
  imgUrl: string;
  links: Link[];
  tags: string[];

  constructor(
    name: string,
    date: string,
    description: string,
    imgUrl: string,
    links: Link[],
    tags: string[]
  ) {
    this.name = name;
    this.date = date;
    this.description = description;
    this.imgUrl = imgUrl;
    this.links = links;
    this.tags = tags;
  }
}

export class ExperienceData {
  name: string;
  description: string;
  imgUrl: string;
  boxHeight: number;
  boxWidth: number;
  startx: number;
  starty: number;

  constructor(
    name: string,
    description: string,
    imgUrl: string,
    boxHeight: number,
    boxWidth: number,
    startx: number,
    starty: number
  ) {
    this.name = name;
    this.description = description;
    this.imgUrl = imgUrl;
    this.boxHeight = boxHeight;
    this.boxWidth = boxWidth;
    this.startx = startx;
    this.starty = starty;
  }
}

export class SkillData {
  name: string;
  imgUrl: string;
  circleSize: number;
  circleTop: number;
  circleLeft: number;

  constructor(
    name: string,
    imgUrl: string,
    circleSize: number,
    circleTop: number,
    circleLeft: number
  ) {
    this.name = name;
    this.imgUrl = imgUrl;
    this.circleSize = circleSize;
    this.circleTop = circleTop;
    this.circleLeft = circleLeft;
  }
}

export type Link = { name: string; href: string };
