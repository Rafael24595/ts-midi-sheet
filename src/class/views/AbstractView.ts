import { EModules } from "../../enum/EModules";
import { IModule } from "../../interface/IModule";
import { IElementModule } from "../../interface/IModuleElement";
import { IResource } from "../../interface/IResource";
import { ISelectOption } from "../../interface/ISelectOption";
import { Groove } from "../../modules/grooves/Groove";
import { KModules } from "../../modules/KModules";
import { Modules } from "../../modules/Modules";
import { TClass } from "../../types/TClass";
import { ModuleElement } from "../ModuleElement";

export class AbstractView {

    private readonly undefined_template = "<h1>Template is not defined</h1>"

    protected template!:string;

    protected title!:string;
    protected resources:{[key:string]:IResource} = {};
    protected aux_scripts:{[key:string]:IModule} = {};
    protected aux_styles:{[key:string]:IModule} = {};

    protected args!:any;

    protected readonly main_template: IModule = KModules.Templates.main;
    protected readonly groove_template!: string[];
    protected readonly main_script!: IModule;
    protected readonly main_style!: IModule;

    constructor(args?:any){
        this.args = args;
        this.addResources({id:"exports",swConstant:false,swParse:false,data:"{}"});
    }

    static start(){
        return new this();
    }

    static startArgs(args?:any){
        return new this(args);
    }

    protected init():void{
        this.setData();
        this.setTemplate();
        this.setTitle();
        this.setMainScript();
        this.setMainStyle();
        this.setResources();
        this.setAuxScripts();
        this.setAuxStyles();
        this.print();
    }

    private print():void{
        this.printGrooves();
        this.printMain();
    }

    private printGrooves():void{
        let content = "Not data found";

        if(this.groove_template){
            let grooves = [];
            for (const groove of this.groove_template) {
                grooves.push(Groove.getGroove(groove));
            }
            content = grooves.join("\n");
        }

        this.printData([
            {name: "modules-area", content:content, notation:"html"}
        ]);  
    }

    protected printMain():void{
        throw new Error("Method not implemented");
    }

    protected setData():void{}

    public addResources(resource:IResource | IResource[]):void{
        if("id" in resource){
            resource = [resource];
        }

        for (const iterator of resource) {
            this.resources[iterator.id] = iterator;
        }
    }

    public addAuxScripts(script:IModule | IModule[]):void{
        if("type" in script){
            script = [script];
        }

        for (const iterator of script) {
            if(iterator.type == EModules.js){
                this.aux_scripts[iterator.name] = iterator;
            }
            else{
                throw new Error("The elements must be an script");
            }
        }
    }

    public addAuxStyle(style:IModule | IModule[]):void{
        if("type" in style){
            style = [style];
        }

        for (const iterator of style) {
            if(iterator.type == EModules.css){
                this.aux_styles[iterator.name] = iterator;
            }
            else{
                throw new Error("The elements must be an style");
            }
        }
    }

    public setTemplate():void{
        this.template = Modules.readModule(this.main_template);
    }

    public setTitle():void{
        let title = (this.title) ? this.title : "Undefined Title";
        this.printData([
            {name: "title", content:title, notation:"html"}
        ]);   
    }

    private setMainScript():void{
        let script = (this.main_script) ? Modules.getModulePath(this.main_script) : ModuleElement.getModuleElement("html-comment", "Main script not found");
        if(this.main_script)
            script = this.getRequire(script, this.main_script.name, this.args);
        let content = this.getScript(script, false);

        this.printData([
            {name: "main-script",content: content,notation: "html-comment"}
        ]);
    }

    private setMainStyle():void{
        let style = (this.main_style) ? Modules.getModulePath(this.main_style) : ModuleElement.getModuleElement("html-comment", "Main style not found");
        let content = this.getStyle(style, true);

        this.printData([
            {name:"main-style", content:content, notation:"html-comment"}
        ]);
    }

    private setResources():void{
        let resourcesValue = [];

        for (const iterator of Object.values(this.resources)) {
            let swReadOnly = (iterator.swConstant) ? "const" : "let";
            let content = (iterator.swParse) ? JSON.parse(iterator.data) : iterator.data;
            resourcesValue.push(`${swReadOnly} ${iterator.id} = ${content};`);
        }

        let content = this.getScript(resourcesValue.join("\n"),false);

        this.printData([
            {name: "resources-area",content: content,notation: "html-comment"}
        ]);
    }

    private setAuxScripts():void{
        let scriptsValue = [];

        for (const iterator of Object.values(this.aux_scripts)) {
            let script = Modules.getModulePath(iterator);
            let content = this.getRequire(script, iterator.name);
            scriptsValue.push(content);
        }

        let content = (scriptsValue.length > 0) ? this.getScript(scriptsValue.join("\n"), false) : ModuleElement.getModuleElement("html-comment", "Not aux scripts declared");

        this.printData([
            {name:"aux-scripts", content:content, notation:"html-comment"}
        ]);
    }

    private setAuxStyles():void{
        let stylesValue = [];

        for (const iterator of Object.values(this.aux_styles)) {
            let style = Modules.getModulePath(iterator);
            stylesValue.push(style);
        }

        let content = (stylesValue.length > 0) ? this.getStyle(stylesValue.join("\n"), true) : ModuleElement.getModuleElement("html-comment", "Not aux styles declared");

        this.printData([
            {name:"aux-styles", content:content, notation:"html-comment"}
        ]);
    }

    public getCallBack(clazz:TClass, method: string, args:any = []):string{
        const className = clazz.name;

        //if(!Reflection.methodExists(method, clazz))
            //throw new Error("Method not exists");
        

        return `${className}.${method}(${args.join(",")})`;
    }

    public getSelectOptions(options:ISelectOption[]):string{
        let htmlOptions = [];
        for (const option of options) {
            const selected = (option.selected) ? "selected" : "";
            htmlOptions.push(`<option value="${option.value}" ${selected}>${option.name}</option>`);
        }
        return htmlOptions.join("\n");
    }

    private getRequire(content:string, name:string, args?:any):string{
        content = content.replace(/\\/g,"\\\\");
        const argsValue = (args != undefined) ? JSON.stringify(args) : "";
        return `const ${name} = require("${content}").${name}; ${name}.onInit(${argsValue})`;
    }

    private getScript(content:string, swPath:boolean):string{
        if(swPath)
            return `<script src="${content}"></script>`;
        return `<script>${content}</script>`;
    }

    private getStyle(content:string, swPath:boolean):string{
        if(swPath)
            return `<link rel="stylesheet" href="${content}">`;
        return `<style>${content}</style>`;
    }

    public getTemplate(swClean?:boolean):string{
        let header = "";
        let content = (this.template) ? this.template : this.undefined_template;

        if(!swClean || !this.template){
            header = "data:text/html;charset=UTF-8,";
        }
    
        return `${header}${encodeURIComponent(content)}`;
    }

    public printData(elements: IElementModule[]):void{
        this.template = this.printModule(this.template, elements);
    }

    public printModule(module: string, elements: IElementModule[]):string{
        for (const element of elements) {
            const regex = ModuleElement.getModuleElementRegex(element.notation, element.name);
            const content = element.content;
            module = module.replace(regex, content);
        }
        return module;
    }

}