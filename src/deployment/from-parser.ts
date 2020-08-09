import { IDomain } from "../interfaces/common/IDomain";
const readFilePromise = require("fs-readfile-promise");
import { IInputTemplate } from "../interfaces/server/ITemplate";
import path from "path";
import { Logger } from "../logger/logger";
import { IPage } from "../interfaces/common/IPage";
export class FormParser {
  public static async getForm(): Promise<IDomain[]> {
    const filePath = path.join(
      path.resolve(process.env.COMPONENTS_ROOT!),
      process.env.MAIN_TEMPLATE_FORM!
    );
    const fileContent = await readFilePromise(filePath);
    const domains = JSON.parse(fileContent) as IDomain[];
    const templateList = await FormParser.loadTemplatesList();
    for (const domain of domains) {
      await FormParser.loadPages(domain);
      for (const page of domain.pages) {
        for (let i = 0; i < page.inputs.length; i++) {
          if (page.inputs[i].template) {
            const newInput = await FormParser.replaceTemlate(
              templateList,
              page.inputs[i]
            );
            if (newInput) {
              page.inputs[i] = newInput;
            }
          }
        }
      }
    }
    return domains;
  }

  private static async replaceTemlate(
    templateList: IInputTemplate[],
    input: any
  ): Promise<any> {
    try {
      if (!input.template) {
        return;
      }
      const loadedTemplatePath = templateList.find(
        (template) => template.templateName === input.template
      );
      if (!loadedTemplatePath) {
        return;
      }
      const loadedTemplatJson = await readFilePromise(
        loadedTemplatePath?.templatePath
      );
      const loadedTemplateObj = JSON.parse(loadedTemplatJson);
      Object.setPrototypeOf(loadedTemplateObj, input);
      const loadedTemplateObjKeys = Object.keys(loadedTemplateObj);
      const iputKeys = Object.keys(input);
      for (const templateKey of loadedTemplateObjKeys) {
        const keyInInput = iputKeys.find((key) => key === templateKey);
        if (!keyInInput) {
          input[templateKey] = loadedTemplateObj[templateKey];
        }
      }
      return input;
    } catch (error) {
      Logger.error(error.message, error.stack);
    }
  }

  private static async getPageContent(fileNmae: string, searchFolder: string) {
    const globby = require("globby");
    const paths = await globby(searchFolder, {
      expandDirectories: {
        files: [fileNmae],
        extensions: ["json"],
      },
    });
    return await readFilePromise(path.resolve(paths[0]));
  }

  private static async loadPages(domain: IDomain) {
    const readdir = require("recursive-readdir");
    const loadedPages: IPage[] = [];
    for (const pageName of domain.pages) {
      try {
        //COWABUNGA
        const content = await this.getPageContent(
          `${pageName}.json`,
          process.env.COMPONENTS_ROOT!
        );
        const page = JSON.parse(content);
        loadedPages.push(page);
      } catch (error) {
        Logger.error(error.message, error.stack);
        throw error;
      }
    }
    domain.pages = loadedPages;
  }

  private static async loadTemplatesList(): Promise<IInputTemplate[]> {
    const readdir = require("recursive-readdir");
    const templates: IInputTemplate[] = [];
    const templatesRoot = path.join(
      path.resolve(process.env.COMPONENTS_ROOT!),
      process.env.FORM_TEMPLATES_FOLDER!
    );
    const templateFiles = await readdir(templatesRoot);
    for (const templatePath of templateFiles) {
      const templateName = templatePath.replace(/^.*[\\\/]/, "").split(".")[0];
      templates.push({ templateName, templatePath });
    }
    return templates;
  }
}
