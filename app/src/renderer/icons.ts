// The icons of the app: Lucide (ISC), the files in assets/icons, built into the script as
// text. A button with data-icon shows its icon in place of its text, which becomes its
// label for screen readers and its tooltip; with data-icon-text it keeps the text too.
import archive from '../../assets/icons/archive.svg';
import arrowDown from '../../assets/icons/arrow-down.svg';
import arrowUp from '../../assets/icons/arrow-up.svg';
import bookOpen from '../../assets/icons/book-open.svg';
import chevronDown from '../../assets/icons/chevron-down.svg';
import chevronUp from '../../assets/icons/chevron-up.svg';
import file from '../../assets/icons/file.svg';
import fileCode from '../../assets/icons/file-code.svg';
import fileText from '../../assets/icons/file-text.svg';
import group from '../../assets/icons/group.svg';
import image from '../../assets/icons/image.svg';
import layoutDashboard from '../../assets/icons/layout-dashboard.svg';
import lightbulb from '../../assets/icons/lightbulb.svg';
import listOrdered from '../../assets/icons/list-ordered.svg';
import listPlus from '../../assets/icons/list-plus.svg';
import notebookPen from '../../assets/icons/notebook-pen.svg';
import palette from '../../assets/icons/palette.svg';
import plus from '../../assets/icons/plus.svg';
import redo2 from '../../assets/icons/redo-2.svg';
import scissors from '../../assets/icons/scissors.svg';
import tableProperties from '../../assets/icons/table-properties.svg';
import table from '../../assets/icons/table.svg';
import textIcon from '../../assets/icons/text.svg';
import trash2 from '../../assets/icons/trash-2.svg';
import undo2 from '../../assets/icons/undo-2.svg';

const ICONS: Record<string, string> = {
  'archive': archive,
  'arrow-down': arrowDown,
  'arrow-up': arrowUp,
  'book-open': bookOpen,
  'chevron-down': chevronDown,
  'chevron-up': chevronUp,
  'file': file,
  'file-code': fileCode,
  'file-text': fileText,
  'group': group,
  'image': image,
  'layout-dashboard': layoutDashboard,
  'lightbulb': lightbulb,
  'list-ordered': listOrdered,
  'list-plus': listPlus,
  'notebook-pen': notebookPen,
  'palette': palette,
  'plus': plus,
  'redo-2': redo2,
  'scissors': scissors,
  'table-properties': tableProperties,
  'table': table,
  'text': textIcon,
  'trash-2': trash2,
  'undo-2': undo2,
};

/** The icon of a kind of object, next to it in the navigator. */
export const KIND_ICONS: Record<string, string> = {
  article: 'file-text', chapter: 'book-open', text: 'text', concept: 'lightbulb', collection: 'table',
  scratch: 'notebook-pen', image: 'image', stylesheet: 'palette',
};

/** The SVG of an icon, without the license comment, hidden to screen readers. */
export function icon(name: string): string {
  const svg = ICONS[name];
  if (svg === undefined) throw new Error(`no icon ${name}`);
  return svg.replace(/<!--[\s\S]*?-->\s*/, '').replace('<svg', '<svg aria-hidden="true" focusable="false"');
}

/** Puts an icon in a button, with its label; the text stays visible only if asked. */
export function setIcon(button: HTMLElement, name: string, label: string, withText = false): void {
  button.dataset.icon = name;
  button.setAttribute('aria-label', label);
  if (!button.title) button.title = label;
  button.classList.add(withText ? 'with-text' : 'icon');
  button.innerHTML = icon(name) + (withText ? `<span>${label.replace(/[&<>]/g, (c) => `&#${c.charCodeAt(0)};`)}</span>` : '');
}

/** Every button with data-icon under a root: its text becomes its label. */
export function decorate(root: ParentNode): void {
  for (const button of root.querySelectorAll<HTMLElement>('[data-icon]')) {
    if (button.querySelector('svg')) continue;
    const label = button.getAttribute('aria-label') ?? button.textContent?.trim() ?? '';
    setIcon(button, button.dataset.icon!, label, button.hasAttribute('data-icon-text'));
  }
}
