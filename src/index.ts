import { Article, ArticleStore } from './article'
import { OutfitStore } from './outfit'

function main(): void {
    let outfitContainer = document.getElementById("outfitContainer") as HTMLDivElement;
    let articleContainer = document.getElementById("articleContainer") as HTMLDivElement;
    let fileSelector = document.getElementById("fileSelector") as HTMLInputElement;
    const menu = document.querySelector(".menu") as HTMLElement;

    if (!outfitContainer || !articleContainer || !fileSelector || !menu) {
        console.log("Unable to init app");
        return;
    }

    let articles = new ArticleStore(articleContainer);
    let outfits = new OutfitStore(outfitContainer);
    fileSelector.addEventListener("change", loadJSONFiles);

    // outfitContainer.ondragover = function(event: DragEvent) {
    //     event.preventDefault();
    // }

    // outfitContainer.ondrop = function(event: DragEvent) {
    //     event.preventDefault();
    //     const modStr = event.dataTransfer?.getData("mod");
    //     const indexStr = event.dataTransfer?.getData("index");
    //     let target = event.target as HTMLDivElement;

    //     if (indexStr && modStr) {
    //         let article = articles.get(modStr, indexStr);
    //         let articleDiv = article.Draw();
    //         target.appendChild(articleDiv);
    //     }
    // }

    function parse(file: File) {
        return new Promise((resolve, reject) => {
            const reader: FileReader = new FileReader();

            reader.onload = function(e: Event) {
                if (!this.result || this.result instanceof ArrayBuffer)
                    return;
                resolve(JSON.parse(this.result));
            };

            reader.onerror = function(e: any) {
                reject(e);
            };

            reader.readAsText(file);
        })
    }

    function updateFoldables() {
        let coll = document.getElementsByClassName("collapsible");
        for (let i = 0; i < coll.length; i++) {
            coll[i].addEventListener("click", function() {
                this.classList.toggle("active");
                var content = this.nextElementSibling;
                if (content.style.display === "block") {
                    content.style.display = "none";
                } else {
                    content.style.display = "block";
                }
            });
        }
    }

    async function loadJSONFiles(event: Event) {
        const target = event.target as HTMLInputElement;
        const files = target.files;

        if (!files)
            return;

        let inputObjs = new Map<string, any>();
        for (let f of files) {
            let key = f.name.replace(/\.json/, "");
            let formMap = await parse(f);
            inputObjs.set(key, formMap);
        }

        articles.clear();
        for (let [mod, rawforms] of inputObjs.entries()) {
            let localArticles = Array<Article>();

            for (let formid in rawforms) {
                try {
                    let newArticle = new Article(mod, rawforms[formid]);
                    articles.insert(newArticle);
                }
                catch (e) {
                    console.log("Record not a valid armor piece: ", e,
                        rawforms[formid]);
                }
            }
        }

        let modContainer = document.getElementById("articleContainer");
        if (!modContainer)
            return;

        modContainer.innerHTML = "";
        for (let [mod, local_articles] of articles.entries()) {
            let modBtn = document.createElement("BUTTON");
            modBtn.textContent = mod;
            modBtn.className = "collapsible";
            modContainer.appendChild(modBtn);
            let articleContainer = document.createElement("div");
            articleContainer.className = "content";
            for (let i = 0; i < local_articles.length; ++i) {
                let article = local_articles[i];
                let articleDiv = article.Draw();
                articleDiv.draggable = true;
                articleDiv.ondragstart =
                    function drag(event: DragEvent) {
                        const target = event.target as HTMLInputElement;
                        event.dataTransfer?.setData("mod", mod);
                        event.dataTransfer?.setData("index", String(i));
                    };

                articleContainer.appendChild(articleDiv);
            }
            articleContainer.style.display = "none";
            modContainer.appendChild(articleContainer);
        }

        updateFoldables();
    }

    // Menu logic
    let menuVisible = false;
    function toggleMenu(command: string) {
        menu.style.display = command === "show" ? "block" : "none";
        menuVisible = !menuVisible;
    };

    function setPosition(origin: { top: number, left: number }) {
        menu.style.left = `${origin.left}px`;
        menu.style.top = `${origin.top}px`;
        toggleMenu("show");
    };

    window.addEventListener("click", function(e) {
        if (menuVisible) toggleMenu("hide");
    });

    window.addEventListener("contextmenu", function(e) {
        e.preventDefault();
        const origin = {
            left: e.pageX,
            top: e.pageY
        };
        setPosition(origin);
        return false;
    });

    let outfitAdder = document.getElementById("outfitAdder");
    outfitAdder?.addEventListener("click", function(e) {
        outfits.insert();
    });
}

main();
