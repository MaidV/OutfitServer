import { Article, ArticleStore, loadJSONFiles } from './article'
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
    fileSelector.addEventListener("change", function(e) {
        loadJSONFiles(e, articles);
    });

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
