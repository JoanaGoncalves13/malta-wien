"use client";

import { useState } from "react";
import ViennaMap from "./ViennaMap";
import { parseGoogleMapsUrl } from "@/lib/geo";
import { useLang } from "@/lib/i18n/LanguageProvider";

export default function LocationPicker({ value, onChange }) {
  const { t } = useLang();
  const [open, setOpen] = useState(false);
  const [link, setLink] = useState("");
  const [hint, setHint] = useState("");

  function applyLink() {
    const coords = parseGoogleMapsUrl(link);
    if (!coords) {
      setHint(t("loc.badLink"));
      return;
    }
    setHint("");
    onChange(coords);
  }

  return (
    <div className="stack loc-picker">
      <div className="loc-head">
        <span className="loc-label">
          {t("loc.location")}{" "}
          {value ? (
            <span className="pos small">{t("loc.pinned")}</span>
          ) : (
            <span className="muted small">{t("common.optional")}</span>
          )}
        </span>
        <div className="toggle">
          <button type="button" className="btn btn-small" onClick={() => setOpen(!open)}>
            {open ? t("loc.hideMap") : t("loc.pickOnMap")}
          </button>
          {value && (
            <button type="button" className="link link-danger small" onClick={() => onChange(null)}>
              {t("loc.clear")}
            </button>
          )}
        </div>
      </div>

      <div className="inline-form">
        <input
          type="text"
          placeholder={t("loc.pasteLink")}
          value={link}
          onChange={(e) => setLink(e.target.value)}
        />
        <button type="button" className="btn btn-small" onClick={applyLink}>
          {t("loc.useLink")}
        </button>
      </div>
      {hint && <p className="error small">{hint}</p>}

      {open && (
        <ViennaMap
          height={260}
          markers={[]}
          picked={value}
          onPick={(lat, lng) => onChange({ lat, lng })}
          showLocate
        />
      )}
    </div>
  );
}
