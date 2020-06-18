import { IInput } from "./../interfaces/IInput";
import { IDomain } from "./../interfaces/IDomain";
import path from "path";
export class FormParser {
  public static getForm() {
    const filePath = path.join(__dirname, process.env.MAIN_TEMPLATE_FORM!);
    const templatesRoot = path.join(__dirname, process.env.FORM_TEMPLATES_FOLDER!);
    const domains = JSON.parse(filePath) as IDomain[];
    const templateList = FormParser.loadTemplatesList();
    for (const domain of domains) {
      for (const page of domain.pages) {
        for (const input of page.inputs) {
          if (input.template) {
            FormParser.replaceTemlate(templateList, input);
          }
        }
      }
    }
  }

  private static replaceTemlate(templateList: string[], input: IInput) {}

  private static loadTemplatesList(): string[] {
    
  }
}
