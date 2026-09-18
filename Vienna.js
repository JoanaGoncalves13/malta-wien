"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  EVENT_CATEGORIES,
  PLACE_CATEGORIES,
  eventCategory,
  placeCategory,
  priceLevelLabel,
  monthKey,
  monthLabel,
  currentMonthKey,
  eventDateLabel,
} from "@/lib/vienna";
import Header from "./Header";
import { useLang } from "@/lib/i18n/LanguageProvider";
import EventForm from "./EventForm";
import PlaceForm from "./PlaceForm";
import ViennaMap from "./ViennaMap";
import { googleMapsLink } from "@/lib/geo";

export default function Vienna({ session }) {
  const me = session.user.id;
  const { t } = useLang();
  const [tab, setTab] = useState("events");
  const [events, setEvents] = useState(null);
  const [places, setPlaces] = useState(null);
  const [month, setMonth] = useState(currentMonthKey());
  const [eventFilter, setEventFilter] = useState("all");
  const [placeFilter, setPlaceFilter] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [showMap, setShowMap] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const [eventsRes, placesRes] = await Promise.all([
      supabase
        .from("events")
        .select("*")
        .order("starts_on", { ascending: true }),
      supabase
        .from("places")
        .select("*")
        .order("created_at", { ascending: false }),
    ]);
    if (eventsRes.error) return setError(eventsRes.error.message);
    if (placesRes.error) return setError(placesRes.error.message);
    setEvents(eventsRes.data ?? []);
    setPlaces(placesRes.data ?? []);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function afterSave() {
    setShowForm(false);
    load();
  }

  async function removeEvent(id) {
    if (!window.confirm("Delete this event?")) return;
    const { error } = await supabase.from("events").delete().eq("id", id);
    if (error) return setError(error.message);
    load();
  }

  async function removePlace(id) {
    if (!window.confirm("Delete this spot?")) return;
    const { error } = await supabase.from("places").delete().eq("id", id);
    if (error) return setError(error.message);
    load();
  }

  // ---- Eventos: agrupar por mês, respeitar filtro ----
  const months = events
    ? [...new Set(events.map((e) => monthKey(e.starts_on)))].sort()
    : [];
  const monthsToShow = months.includes(month) ? months : [month, ...months].sort();

  const monthEvents = (events ?? [])
    .filter((e) => monthKey(e.starts_on) === month)
    .filter((e) => eventFilter === "all" || (eventFilter === "free" ? e.is_free : e.category === eventFilter));

  const usedEventCats = new Set((events ?? []).filter((e) => monthKey(e.starts_on) === month).map((e) => e.category));

  const eventMarkers = monthEvents
    .filter((e) => e.lat != null && e.lng != null)
    .map((e) => ({ lat: e.lat, lng: e.lng, title: e.title, subtitle: e.place || "", color: "#d81e2c" }));

  // ---- Sítios: filtro por tipo ----
  const shownPlaces = (places ?? []).filter(
    (p) => placeFilter === "all" || p.category === placeFilter
  );
  const usedPlaceCats = new Set((places ?? []).map((p) => p.category));

  const placeMarkers = shownPlaces
    .filter((p) => p.lat != null && p.lng != null)
    .map((p) => ({ lat: p.lat, lng: p.lng, title: p.name, subtitle: p.area || "", color: "#0f7457" }));

  return (
    <>
      <Header />
      <main className="page">
        <h1 className="hello">{t("vie.title")}</h1>
        <p className="subtitle">{t("vie.subtitle")}</p>

        <div className="tabs">
          <button
            className="tab"
            aria-pressed={tab === "events"}
            onClick={() => { setTab("events"); setShowForm(false); }}
          >
            {t("vie.whatsOn")}
          </button>
          <button
            className="tab"
            aria-pressed={tab === "places"}
            onClick={() => { setTab("places"); setShowForm(false); }}
          >
            {t("vie.spots")}
          </button>
        </div>

        {error && <p className="error block" role="alert">{error}</p>}

        {tab === "events" && (
          <>
            <div className="month-nav">
              <label className="month-select">
                {t("vie.month")}
                <select value={month} onChange={(e) => setMonth(e.target.value)}>
                  {monthsToShow.map((m) => (
                    <option key={m} value={m}>{monthLabel(m)}</option>
                  ))}
                </select>
              </label>
            </div>

            <div className="chips">
              <button className="chip" aria-pressed={eventFilter === "all"} onClick={() => setEventFilter("all")}>
                {t("common.all")}
              </button>
              <button className="chip" aria-pressed={eventFilter === "free"} onClick={() => setEventFilter("free")}>
                🆓 {t("common.free")}
              </button>
              {EVENT_CATEGORIES.filter((c) => c.value !== "free" && usedEventCats.has(c.value)).map((c) => (
                <button
                  key={c.value}
                  className="chip"
                  aria-pressed={eventFilter === c.value}
                  onClick={() => setEventFilter(c.value)}
                >
                  {c.emoji} {t("evt." + c.value)}
                </button>
              ))}
            </div>

            {eventMarkers.length > 0 && showMap && (
              <div className="block">
                <ViennaMap markers={eventMarkers} height={320} />
              </div>
            )}

            {events === null ? (
              <p className="muted">Loading…</p>
            ) : monthEvents.length === 0 ? (
              <p className="muted block">
                {t("vie.nothingMonth", { month: monthLabel(month) })}
              </p>
            ) : (
              <ul className="list block">
                {monthEvents.map((e) => {
                  const cat = eventCategory(e.category);
                  return (
                    <li key={e.id} className="event">
                      <div className="event-date">
                        <span className="event-emoji">{cat.emoji}</span>
                        <span className="event-day">{eventDateLabel(e.starts_on, e.ends_on)}</span>
                      </div>
                      <div className="event-body">
                        <p className="title">{e.title}</p>
                        <p className="muted small">
                          {[e.time_label, e.place].filter(Boolean).join(" · ")}
                        </p>
                        {e.notes && <p className="small event-notes">{e.notes}</p>}
                        <div className="event-tags">
                          {e.is_free ? (
                            <span className="tag tag-free">{t("common.free")}</span>
                          ) : e.price_label ? (
                            <span className="tag tag-price">{e.price_label}</span>
                          ) : null}
                          {e.url && (
                            <a className="tag tag-link" href={e.url} target="_blank" rel="noopener noreferrer">
                              {t("vie.link")} ↗
                            </a>
                          )}
                          {e.lat != null && e.lng != null && (
                            <a className="tag tag-map" href={googleMapsLink(e.lat, e.lng)} target="_blank" rel="noopener noreferrer">
                              {t("vie.map")} ↗
                            </a>
                          )}
                          {e.created_by === me && (
                            <button className="link link-danger" onClick={() => removeEvent(e.id)}>
                              Delete
                            </button>
                          )}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}

            <section className="block">
              {showForm ? (
                <EventForm onSaved={afterSave} onCancel={() => setShowForm(false)} />
              ) : (
                <button className="btn btn-primary btn-full" onClick={() => setShowForm(true)}>
                  {t("vie.addEvent")}
                </button>
              )}
            </section>
          </>
        )}

        {tab === "places" && (
          <>
            <div className="chips">
              <button className="chip" aria-pressed={placeFilter === "all"} onClick={() => setPlaceFilter("all")}>
                {t("common.all")}
              </button>
              {PLACE_CATEGORIES.filter((c) => usedPlaceCats.has(c.value)).map((c) => (
                <button
                  key={c.value}
                  className="chip"
                  aria-pressed={placeFilter === c.value}
                  onClick={() => setPlaceFilter(c.value)}
                >
                  {c.emoji} {t("plc." + c.value)}
                </button>
              ))}
            </div>

            {placeMarkers.length > 0 && showMap && (
              <div className="block">
                <ViennaMap markers={placeMarkers} height={320} />
              </div>
            )}

            {places === null ? (
              <p className="muted">Loading…</p>
            ) : shownPlaces.length === 0 ? (
              <p className="muted block">{t("vie.noSpots")}</p>
            ) : (
              <ul className="list block">
                {shownPlaces.map((p) => {
                  const cat = placeCategory(p.category);
                  return (
                    <li key={p.id} className="row place">
                      <div>
                        <p className="title">
                          <span className="event-emoji">{cat.emoji}</span> {p.name}
                        </p>
                        <p className="muted small">
                          {[t("plc." + p.category), p.area, priceLevelLabel(p.price_level)].filter(Boolean).join(" · ")}
                        </p>
                        {p.notes && <p className="small event-notes">{p.notes}</p>}
                      </div>
                      <div className="right">
                        {p.url && (
                          <a className="tag tag-link" href={p.url} target="_blank" rel="noopener noreferrer">
                            {t("vie.link")} ↗
                          </a>
                        )}
                        {p.lat != null && p.lng != null && (
                          <a className="tag tag-map" href={googleMapsLink(p.lat, p.lng)} target="_blank" rel="noopener noreferrer">
                            {t("vie.map")} ↗
                          </a>
                        )}
                        {p.created_by === me && (
                          <button className="link link-danger" onClick={() => removePlace(p.id)}>
                            Delete
                          </button>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}

            <section className="block">
              {showForm ? (
                <PlaceForm onSaved={afterSave} onCancel={() => setShowForm(false)} />
              ) : (
                <button className="btn btn-primary btn-full" onClick={() => setShowForm(true)}>
                  {t("vie.addSpot")}
                </button>
              )}
            </section>
          </>
        )}
      </main>
    </>
  );
}
