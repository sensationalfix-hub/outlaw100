'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { Map as LeafletMap, LayerGroup } from 'leaflet';
import { buildCanonicalMapItems, buildRuntimeMapItems, type RemoteMapMarker, type RuntimeMapItem } from '@/features/map/model';
import { getMilestoneMapContext } from '@/features/map/nearby';
import { useProgress } from '@/features/progress/progress-context';
import { ProgressStatusSelect } from '@/features/progress/status-control';
import type { CanonicalCatalog, CatalogMilestone } from '@/lib/catalog/types';

export function MapView({ catalog, currentMilestone, focusEntityId }: { catalog: CanonicalCatalog; currentMilestone: CatalogMilestone; focusEntityId?: string | null }) {
  const progress = useProgress();
  const stageRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const layerRef = useRef<LayerGroup | null>(null);
  const [items, setItems] = useState<RuntimeMapItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [category, setCategory] = useState('ALL');
  const [query, setQuery] = useState('');
  const [hideDone, setHideDone] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      let lastError: unknown = null;
      for (const url of catalog.mapSources?.markers ?? []) {
        try {
          const response = await fetch(url, { cache: 'force-cache' });
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          const raw = await response.json() as RemoteMapMarker[];
          if (!cancelled) {
            const remoteItems = buildRuntimeMapItems(raw, catalog);
            const canonicalItems = buildCanonicalMapItems(catalog);
            const canonicalIds = new Set(canonicalItems.map((item) => `${item.entityId ?? ''}:${item.criterionId ?? ''}:${item.lat.toFixed(4)}:${item.lng.toFixed(4)}`));
            setItems([
              ...canonicalItems,
              ...remoteItems.filter((item) => !canonicalIds.has(`${item.entityId ?? ''}:${item.criterionId ?? ''}:${item.lat.toFixed(4)}:${item.lng.toFixed(4)}`)),
            ]);
          }
          if (!cancelled) setError(null);
          if (!cancelled) setLoading(false);
          return;
        } catch (cause) { lastError = cause; }
      }
      if (!cancelled) {
        const canonicalItems = buildCanonicalMapItems(catalog);
        setItems(canonicalItems);
        setError(lastError instanceof Error ? `Marcadores comunitarios no disponibles: ${lastError.message}` : 'No se pudieron cargar los marcadores comunitarios');
        setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [catalog]);

  const categories = useMemo(() => [...new Set(items.map((item) => item.category))].sort((a,b) => a.localeCompare(b,'es')), [items]);
  const filtered = useMemo(() => items.filter((item) => {
    if (category !== 'ALL' && item.category !== category) return false;
    if (query && !`${item.name} ${item.category} ${item.description}`.toLowerCase().includes(query.toLowerCase())) return false;
    if (hideDone && item.criterionId && progress.snapshot.criteria[item.criterionId] === 'completed') return false;
    return true;
  }), [items, category, query, hideDone, progress.snapshot.criteria]);
  const selected = items.find((item) => item.id === selectedId) ?? filtered[0] ?? null;
  const selectedEntity = selected?.entityId ? catalog.entities.find((item) => item.id === selected.entityId) : null;
  const selectedCriteria = selectedEntity ? catalog.criteria.filter((item) => item.entityId === selectedEntity.id) : [];
  useEffect(() => {
    if (!focusEntityId || !items.length) return;
    const match = items.find((item) => item.entityId === focusEntityId);
    if (!match) return;
    setCategory('ALL');
    setHideDone(false);
    setQuery('');
    setSelectedId(match.id);
  }, [focusEntityId, items]);
  const milestoneContext = useMemo(
    () => getMilestoneMapContext(items, catalog, currentMilestone.id, 6),
    [items, catalog, currentMilestone.id],
  );
  const linkedIds = useMemo(() => new Set(milestoneContext.linked.map((item) => item.id)), [milestoneContext.linked]);
  const nearbyIds = useMemo(() => new Set(milestoneContext.nearby.map((item) => item.id)), [milestoneContext.nearby]);

  useEffect(() => {
    if (!stageRef.current || mapRef.current) return;
    let disposed = false;
    void import('leaflet').then((L) => {
      if (disposed || !stageRef.current || mapRef.current) return;
      const bounds = L.latLngBounds(L.latLng(-190, 0), L.latLng(0, 256));
      const map = L.map(stageRef.current, {
        crs: L.CRS.Simple,
        minZoom: 2,
        maxZoom: 8,
        zoomSnap: .1,
        maxBounds: bounds,
        maxBoundsViscosity: .8,
        preferCanvas: true,
      }).setView([-70, 111.75], 3);
      L.tileLayer(catalog.mapSources?.tiles ?? '', { noWrap: true, bounds, minZoom: 2, maxZoom: 8, maxNativeZoom: 8, attribution: 'RDR2 map © Rockstar Games / Take-Two · community marker dataset' }).addTo(map);
      mapRef.current = map;
      layerRef.current = L.layerGroup().addTo(map);
    });
    return () => {
      disposed = true;
      mapRef.current?.remove();
      mapRef.current = null;
      layerRef.current = null;
    };
  }, [catalog.mapSources?.tiles]);

  useEffect(() => {
    if (!mapRef.current || !layerRef.current) return;
    let cancelled = false;
    void import('leaflet').then((L) => {
      if (cancelled || !layerRef.current) return;
      layerRef.current.clearLayers();
      for (const item of filtered) {
        const done = item.criterionId ? progress.snapshot.criteria[item.criterionId] === 'completed' : false;
        const linkedToMilestone = linkedIds.has(item.id);
        const nearMilestone = nearbyIds.has(item.id);
        const marker = L.circleMarker([item.lat, item.lng], {
          radius: selectedId === item.id ? 8 : linkedToMilestone ? 7 : nearMilestone ? 6 : 5,
          weight: selectedId === item.id || linkedToMilestone ? 2 : 1,
          color: done ? '#89946c' : '#d6cfb9',
          fillColor: done ? '#89946c' : '#c3291d',
          fillOpacity: done ? .45 : linkedToMilestone ? .96 : nearMilestone ? .76 : .62,
        });
        marker.bindTooltip(item.name, { direction: 'top', opacity: .92 });
        marker.on('click', () => setSelectedId(item.id));
        marker.addTo(layerRef.current!);
      }
    });
    return () => { cancelled = true; };
  }, [filtered, selectedId, progress.snapshot.criteria, linkedIds, nearbyIds]);

  useEffect(() => {
    if (!selected || !mapRef.current) return;
    mapRef.current.flyTo([selected.lat, selected.lng], Math.max(mapRef.current.getZoom(), 5), { animate: true, duration: .45 });
  }, [selectedId]);

  return <section className="content-view map-view"><header className="view-heading"><div><small>MAPA REAL · SIN RED DEAD ONLINE</small><h1>El Oeste</h1><p>Tiles y marcadores del sistema que ya utilizaba OUTLAW100, ahora enlazados al catálogo y progreso canónicos.</p></div><span className="big-count">{filtered.length}</span></header>
    <div className="map-layout">
      <div className="map-panel"><div className="map-toolbar"><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar marcador…" /><select value={category} onChange={(e) => setCategory(e.target.value)}><option value="ALL">Todas las categorías</option>{categories.map((item) => <option key={item}>{item}</option>)}</select><button className={hideDone ? 'active' : ''} onClick={() => setHideDone((value) => !value)}>Ocultar hechos</button></div><div className="leaflet-stage" ref={stageRef} />{loading && <div className="map-loading"><b>Cargando el Oeste</b><span>Marcadores reales y mapa detallado.</span></div>}{error && <div className="map-error">{error}</div>}</div>
      <aside className="detail-panel map-detail"><section className="milestone-map-context"><small className="detail-kicker">HITO ACTUAL</small><h3>{currentMilestone.title}</h3>{milestoneContext.linked.length ? <><p>{milestoneContext.linked.length} punto(s) del mapa enlazados directamente a sus checks canónicos.</p><div className="map-context-list">{milestoneContext.linked.map((item) => <button key={item.id} onClick={() => setSelectedId(item.id)}><b>Objetivo</b><span>{item.name}</span></button>)}</div>{milestoneContext.nearby.length > 0 && <><small className="detail-kicker">CERCA DE LA RUTA</small><div className="map-context-list">{milestoneContext.nearby.map((item) => <button key={item.id} onClick={() => setSelectedId(item.id)}><b>+ {item.distance.toFixed(1)}</b><span>{item.name}</span></button>)}</div></>}</> : <p className="empty-copy">Este hito no tiene todavía un ancla geográfica inequívoca. No inventamos una solo para que el mapa parezca ocupado.</p>}</section>{selected ? <><small className="detail-kicker">{selected.category}</small><h2>{selected.name}</h2><p>{selected.description || 'Marcador real del mapa de RDR2.'}</p><div className="detail-meta"><div><small>COORDENADAS</small><b>{selected.lat.toFixed(3)}, {selected.lng.toFixed(3)}</b></div><div><small>ENLACE</small><b>{selectedEntity ? 'Catálogo canónico' : 'Marcador independiente'}</b></div></div>{selectedEntity && <><h4>{selectedEntity.name}</h4><div className="criteria-list">{selectedCriteria.map((criterion) => { const status = progress.snapshot.criteria[criterion.id] ?? 'not_started'; const done = status === 'completed'; return <div key={criterion.id} className={`criterion-row status-${status}`}><button className={done ? 'done' : ''} onClick={() => progress.setCriterionStatus(criterion.id, done ? 'not_started' : 'completed')}><span>{done ? '✓' : ''}</span><div><b>{criterion.label}</b><small>{criterion.key}</small></div></button><ProgressStatusSelect value={status} onChange={(next) => progress.setCriterionStatus(criterion.id, next)} label={`Estado: ${criterion.label}`} /></div>; })}</div></>}</> : <p className="empty-copy">Selecciona un punto.</p>}</aside>
    </div>
  </section>;
}
