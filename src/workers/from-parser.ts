const readFilePromise = require("fs-readfile-promise");
import { ITemplate } from "./../interfaces/ITemplate";
import { IDomain } from "./../interfaces/IDomain";
import path from "path";
export class FormParser {
  public static async getForm(): Promise<IDomain[]> {
    const fs = require("fs");
    const filePath = path.join(__dirname, process.env.MAIN_TEMPLATE_FORM!);
    const fileContent = await readFilePromise(filePath);
    const domains = JSON.parse(fileContent) as IDomain[];
    const templateList = await FormParser.loadTemplatesList();
    for (const domain of domains) {
      for (const page of domain.pages) {
        for (let i = 0; i < page.inputs.length; i++) {
          if (page.inputs[i].template) {
            const newInput = await FormParser.replaceTemlate(templateList, page.inputs[i]);
            if (newInput) {
              page.inputs[i] = newInput;
            }
          }
        }
      }
    }
    return domains;
  }

  private static async replaceTemlate(templateList: ITemplate[], input: any): Promise<any> {
    try {
      if (!input.template) {
        return;
      }
      const loadedTemplatePath = templateList.find((template) => template.templateName === input.template);
      if (!loadedTemplatePath) {
        return;
      }
      const loadedTemplatJson = await readFilePromise(loadedTemplatePath?.templatePath);
      const loadedTemplateObj = JSON.parse(loadedTemplatJson);
      Object.setPrototypeOf(loadedTemplateObj, input);
      const loadedTemplateObjKeys = Object.keys(loadedTemplateObj);
      const iputKeys = Object.keys(input);
      for (const templateKey of loadedTemplateObjKeys) {
        const keyInInput = iputKeys.find((key) =>
          key === templateKey
        );
        if (!keyInInput) {
          input[templateKey] = loadedTemplateObj[templateKey];
        }
      }
      return input;
    } catch (error) {
      console.log("error!!!!!");
      console.log(error.message);
      console.log(error);
    }
  }

  private static async loadTemplatesList(): Promise<ITemplate[]> {
    const readdir = require("recursive-readdir");
    const templates: ITemplate[] = [];
    const templatesRoot = path.join(__dirname, process.env.FORM_TEMPLATES_FOLDER!);
    const templateFiles = await readdir(templatesRoot);
    for (const templatePath of templateFiles) {
      const templateName = templatePath.replace(/^.*[\\\/]/, "").split(".")[0];
      templates.push({ templateName, templatePath });
    }
    return templates;
  }
}