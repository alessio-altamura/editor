// The icons of the app: Lucide (ISC), the files in assets/icons, built into the script as
// text. A button with data-icon shows its icon in place of its text, which becomes its
// label for screen readers and its tooltip; with data-icon-text it keeps the text too.
import appWindow from '../../assets/icons/app-window.svg';
import archive from '../../assets/icons/archive.svg';
import arrowDown from '../../assets/icons/arrow-down.svg';
import arrowUp from '../../assets/icons/arrow-up.svg';
import chartColumn from '../../assets/icons/chart-column.svg';
import chartLine from '../../assets/icons/chart-line.svg';
import chartScatter from '../../assets/icons/chart-scatter.svg';
import chevronDown from '../../assets/icons/chevron-down.svg';
import chevronUp from '../../assets/icons/chevron-up.svg';
import fileCode from '../../assets/icons/file-code.svg';
import fileText from '../../assets/icons/file-text.svg';
import group from '../../assets/icons/group.svg';
import layoutDashboard from '../../assets/icons/layout-dashboard.svg';
import listOrdered from '../../assets/icons/list-ordered.svg';
import listPlus from '../../assets/icons/list-plus.svg';
import panelRight from '../../assets/icons/panel-right.svg';
import plus from '../../assets/icons/plus.svg';
import redo2 from '../../assets/icons/redo-2.svg';
import scissors from '../../assets/icons/scissors.svg';
import tableProperties from '../../assets/icons/table-properties.svg';
import table from '../../assets/icons/table.svg';
import trash2 from '../../assets/icons/trash-2.svg';
import undo2 from '../../assets/icons/undo-2.svg';
import xIcon from '../../assets/icons/x.svg';

const ICONS: Record<string, string> = {
  'app-window': appWindow,
  'archive': archive,
  'arrow-down': arrowDown,
  'arrow-up': arrowUp,
  'chart-column': chartColumn,
  'chart-line': chartLine,
  'chart-scatter': chartScatter,
  'chevron-down': chevronDown,
  'chevron-up': chevronUp,
  'file-code': fileCode,
  'file-text': fileText,
  'group': group,
  'layout-dashboard': layoutDashboard,
  'list-ordered': listOrdered,
  'list-plus': listPlus,
  'panel-right': panelRight,
  'plus': plus,
  'redo-2': redo2,
  'scissors': scissors,
  'table-properties': tableProperties,
  'table': table,
  'trash-2': trash2,
  'undo-2': undo2,
  'x': xIcon,
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
