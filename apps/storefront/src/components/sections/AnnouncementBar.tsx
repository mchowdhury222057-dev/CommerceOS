import type { AnnouncementBarSettings } from "../../lib/api-types";

// Per Section 10 - site-wide chrome above the header (not a reorderable
// body section, same reasoning as Header/Footer - see the settings shape's
// own comment in @commerceos/types).
export function AnnouncementBar({ settings }: { settings: AnnouncementBarSettings }) {
  if (!settings.enabled || !settings.text) return null;

  const content = (
    <p className="mx-auto max-w-6xl px-4 py-2 text-center text-xs font-medium sm:text-sm">
      {settings.text}
      {settings.link && settings.linkText && <span className="ml-2 underline underline-offset-2">{settings.linkText}</span>}
    </p>
  );

  const style = { backgroundColor: settings.backgroundColor, color: settings.textColor };

  if (settings.link) {
    return (
      <a href={settings.link} style={style} className="block">
        {content}
      </a>
    );
  }
  return <div style={style}>{content}</div>;
}
