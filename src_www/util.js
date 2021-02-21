export function parse(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = function (e) {
            if (!this.result || this.result instanceof ArrayBuffer)
                return;
            resolve(JSON.parse(this.result));
        };
        reader.onerror = function (e) {
            reject(e);
        };
        reader.readAsText(file);
    });
}
export function updateFoldables() {
    let coll = document.getElementsByClassName("collapsible");
    for (let i = 0; i < coll.length; i++) {
        coll[i].addEventListener("click", function () {
            this.classList.toggle("active");
            var content = this.nextElementSibling;
            if (content.style.display === "block") {
                content.style.display = "none";
            }
            else {
                content.style.display = "block";
            }
        });
    }
}
//# sourceMappingURL=util.js.map