
export class Article {
    public readonly name: string = "";
    public readonly FormID: string = "";
    public readonly EDID: string = "";
    public readonly slots: Array<string> = [];

    constructor(form: {
        "FULL - Name": string,
        "Record Header": { "FormID": string, "Record Flags": { "Non-Playable": string } },
        "EDID - Editor ID": string,
        "BOD2 - Biped Body Template": { "First Person Flags": any },
    }) {
        try {
            if (form["Record Header"]["Record Flags"]["Non-Playable"])
                throw 'Non-playable form';
            this.name = form["FULL - Name"];
            if (!this.name)
                throw 'Undefined name';
            this.FormID = "0x" + form["Record Header"]["FormID"].substr(2);
            this.EDID = form["EDID - Editor ID"];
            this.slots = Object.keys(form["BOD2 - Biped Body Template"]["First Person Flags"]);
            if (Object.keys(this.slots).length == 0)
                throw 'No slots defined';
        }
        catch (e) {
            throw e;
        }
    }

    public Draw(): HTMLElement {
        let divEl = document.createElement("div");
        divEl.innerHTML = `${this.name}<br>&nbsp&nbsp&nbsp&nbsp${this.slots.join(', ')}`;
        return divEl;
    }
}
