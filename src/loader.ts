export type Data = {
  img: { [key: string]: HTMLImageElement }
  json: { [key: string]: any }
}

export class Loader {
  count: number;
  tasks: (() => void)[];
  data: Data;
  k: (d: Data) => any = () => { };

  constructor() {
    this.count = 0;
    this.tasks = [];
    this.data = { img: {}, json: {} };
  }

  add(task: () => void): void {
    this.tasks.push(task);
    this.count--;
  }

  done(k: (d: Data) => void): void {
    this.k = k;
    this.tasks.forEach(x => x());
  }

  image(src: string, name: string): void {
    this.add(() => {
      var im = new Image();
      im.src = src;
      im.onload = () => {
        this.data.img[name] = im;
        this.succ();
      }
    });
  }

  succ(): void {
    if (++this.count == 0) {
      this.k(this.data);
    }
  }

  json_file(which: string, url: string): void {
    if (url == undefined) {
      url = which + ".json";
    }
    this.add(() => {
      const req = new Request(url);
      fetch(req)
        .then(r => r.json())
        .then(x => {
          this.data.json[which] = x;
          this.succ();
        })
        .catch(console.error);
    });
  }

}
