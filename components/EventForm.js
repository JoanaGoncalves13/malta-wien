"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { EVENT_CATEGORIES } from "@/lib/vienna";
import { todayISO } from "@/lib/money";
import { useLang } from "@/lib/i18n/LanguageProvider";
import LocationPicker from "./LocationPicker";

export default function EventForm({ onSaved, onCancel }) {
  const { t } = useLang();
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("music");
  const [startsOn, setStartsOn] = useState(todayISO());
  const [endsOn, setEndsOn] = useState("");
  const [timeLabel, setTimeLabel] = useState("");
  const [place, setPlace] = useState("");
  const [isFree, setIsFree] = useState(false);
  const [priceLabel, setPriceLabel] = useState("");
  const [url, setUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [coords, setCoords] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    if (!title.trim()) return setError(t("ef.giveEventName"));

    setBusy(true);
    const { error } = await supabase.from("events").insert({
      title: title.trim(),
      category,
      starts_on: startsOn,
      ends_on: endsOn || null,
      time_label: timeLabel.trim() || null,
      place: place.trim() || null,
      is_free: isFree,
      price_label: isFree ? null : priceLabel.trim() || null,
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
      <h2>{t("vie.addEvent")}</h2>

      <label>
        {t("ef.name")}
        <input
          required
          maxLength={120}
          placeholder={t("ef.namePh")}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </label>

      <div className="grid2">
        <label>
          {t("ef.type")}
          <select value={category} onChange={(e) => setCategory(e.target.value)}>
            {EVENT_CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.emoji} {t("evt." + c.value)}
              </option>
            ))}
          </select>
        </label>
        <label>
          {t("ef.where")}
          <input
            maxLength={120}
            placeholder={t("ef.venuePh")}
            value={place}
            onChange={(e) => setPlace(e.target.value)}
          />
        </label>
      </div>

      <div className="grid2">
        <label>
          {t("common.date")}
          <input type="date" required value={startsOn} onChange={(e) => setStartsOn(e.target.value)} />
        </label>
        <label>
          {t("ef.endDate")}
          <input
            type="date"
            min={startsOn}
            value={endsOn}
            onChange={(e) => setEndsOn(e.target.value)}
          />
        </label>
      </div>

      <label>
        {t("ef.time")}
        <input
          maxLength={40}
          placeholder={t("ef.timePh")}
          value={timeLabel}
          onChange={(e) => setTimeLabel(e.target.value)}
        />
      </label>

      <label className="check">
        <input type="checkbox" checked={isFree} onChange={(e) => setIsFree(e.target.checked)} />
        {t("ef.itsFree")}
      </label>

      {!isFree && (
        <label>
          {t("ef.price")}
          <input
            maxLength={40}
            placeholder={t("ef.pricePh")}
            value={priceLabel}
            onChange={(e) => setPriceLabel(e.target.value)}
          />
        </label>
      )}

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
          placeholder={t("ef.notesPh")}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </label>

      <LocationPicker value={coords} onChange={setCoords} />

      {error && <p className="error" role="alert">{error}</p>}

      <div className="toggle">
        <button className="btn btn-primary" disabled={busy}>{t("ef.saveEvent")}</button>
        <button type="button" className="btn" onClick={onCancel}>{t("common.cancel")}</button>
      </div>
    </form>
  );
}
