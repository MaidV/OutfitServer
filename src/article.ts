
export class Article {
  public readonly name: string = "";
  public readonly FormID: string = "";
  public readonly EDID: string = "";
  public readonly slots: any = {};

  constructor(form: {
    "FULL - Name": string,
    "Record Header": { "FormID": string },
    "EDID - Editor ID": string,
    "BOD2 - Biped Body Template": { "First Person Flags": any },
  }) {
    try {
      this.name = form["FULL - Name"];
      this.FormID = "0x" + form["Record Header"]["FormID"].substr(2);
      this.EDID = form["EDID - Editor ID"];
      this.slots = form["BOD2 - Biped Body Template"]["First Person Flags"];
    }
    catch (e) {
      throw e;
    }
  }
}
