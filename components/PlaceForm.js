"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { PLACE_CATEGORIES } from "@/lib/vienna";
import { useLang } from "@/lib/i18n/LanguageProvider";
import LocationPicker from "./LocationPicker";

export default function PlaceForm({ onSaved, onCancel }) {
  const { t } = useLang();
  const [name, setName] = useState("");
  const [category, setCategory] = useState("eat");
  const [area, setArea] = useState("");
  const [priceLevel, setPriceLevel] = useState("");
  const [url, setUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [coords, setCoords] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    if (!name.trim()) return setError(t("pf.giveSpotName"));

    setBusy(true);
    const { error } = await supabase.from("places").insert({
      name: name.trim(),
      category,
      area: area.trim() || null,
      price_level: priceLevel ? Number(priceLevel) : null,
      url: url.trim() || null,
      notes: notes.trim() || null,
      lat: coords?.lat ?? null,
      lng: coords?.lng ?? null,
    });
    setBusy(false);
    if (error) return setError(error.message);
    onSaved();
  }

  return (
    <form className="panel stack" onSubmit={handleSubmit}>
      <h2>{t("vie.addSpot")}</h2>

      <label>
        {t("ef.name")}
        <input
          required
          maxLength={120}
          placeholder={t("pf.namePh")}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </label>

      <div className="grid2">
        <label>
          {t("ef.type")}
          <select value={category} onChange={(e) => setCategory(e.target.value)}>
            {PLACE_CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.emoji} {t("plc." + c.value)}
              </option>
            ))}
          </select>
        </label>
        <label>
          {t("pf.area")}
          <input
            maxLength={80}
            placeholder={t("pf.areaPh")}
            value={area}
            onChange={(e) => setArea(e.target.value)}
          />
        </label>
      </div>

      <label>
        {t("pf.howPricey")}
        <select value={priceLevel} onChange={(e) => setPriceLevel(e.target.value)}>
          <option value="">{t("pf.notSure")}</option>
          <option value="1">{t("pf.cheap")}</option>
          <option value="2">{t("pf.mid")}</option>
          <option value="3">{t("pf.pricey")}</option>
        </select>
      </label>

      <label>
        {t("ef.link")}
        <input
          type="url"
          maxLength={400}
          placeholder="https://…"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />
      </label>

      <label>
        {t("ef.notes")}
        <input
          maxLength={500}
          placeholder={t("pf.notesPh")}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </label>

      <LocationPicker value={coords} onChange={setCoords} />

      {error && <p className="error" role="alert">{error}</p>}

      <div className="toggle">
        <button className="btn btn-primary" disabled={busy}>{t("pf.saveSpot")}</button>
        <button type="button" className="btn" onClick={onCancel}>{t("common.cancel")}</button>
      </div>
    </form>
  );
}
