'use client';

import { useMemo, useState } from 'react';
import { AppShell } from '@/components/app-shell/app-shell';
import type { AppView } from '@/components/app-shell/nav';
import { DashboardView } from '@/components/views/dashboard-view';
import { RouteView } from '@/components/views/route-view';
import { EntityGridView } from '@/components/views/entity-grid-view';
import { ArchiveView } from '@/components/views/archive-view';
import { CraftingView } from '@/components/views/crafting-view';
import { MapView } from '@/components/views/map-view';
import { StoryView } from '@/components/views/story-view';
import type { SearchHit } from '@/features/search/model';
import { ProgressProvider, useProgress } from '@/features/progress/progress-context';
import { getRecommendedMilestone } from '@/features/route/engine';
import { useCanonicalCatalog } from '@/lib/catalog/client';
import type { CatalogMilestone } from '@/lib/catalog/types';
import { appViewForEntity, ENTITY_VIEW_CONFIGS } from '@/features/navigation/model';

const ENTITY_VIEWS = ENTITY_VIEW_CONFIGS;

function LoadedApp() {
  const { catalog, error } = useCanonicalCatalog();
  const progress = useProgress();
  const [view, setView] = useState<AppView>('dashboard');
  const [selectedMilestoneId, setSelectedMilestoneId] = useState<string | null>(null);
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null);
  const [mapFocusEntityId, setMapFocusEntityId] = useState<string | null>(null);
  const recommended = catalog ? getRecommendedMilestone(catalog, progress.snapshot) : null;
  const selected = catalog?.milestones.find((item) => item.id === selectedMilestoneId) ?? recommended ?? catalog?.milestones[0] ?? null;
  const totalTrackable = catalog ? catalog.criteria.length + catalog.milestoneTasks.filter((task) => !task.criterionId).length : 0;
  const completed = catalog ? Object.values(progress.snapshot.criteria).filter((s) => s === 'completed').length + catalog.milestoneTasks.filter((task) => !task.criterionId && progress.snapshot.tasks[task.id] === 'completed').length : 0;
  const pct = totalTrackable ? completed / totalTrackable * 100 : 0;

  function handleSearchHit(hit: SearchHit) {
    if (!catalog) return;
    if (hit.kind === 'milestone' && hit.milestoneId) {
      setSelectedMilestoneId(hit.milestoneId);
      setSelectedEntityId(null);
      setView('dashboard');
      return;
    }
    if (hit.entityId) {
      const entity = catalog.entities.find((item) => item.id === hit.entityId);
      if (!entity) return;
      setSelectedEntityId(entity.id);
      setView(appViewForEntity(entity));
    }
  }

  function openEntity(entityId: string) {
    if (!catalog) return;
    const entity = catalog.entities.find((item) => item.id === entityId);
    if (!entity) return;
    setSelectedEntityId(entity.id);
    setView(appViewForEntity(entity));
  }

  function openMapForEntity(entityId: string) {
    setMapFocusEntityId(entityId);
    setView('map');
  }

  function openMilestone(milestone: CatalogMilestone) {
    setSelectedMilestoneId(milestone.id);
    setSelectedEntityId(null);
    setView('dashboard');
  }

  const page = useMemo(() => {
    if (!catalog || !selected) return null;
    if (view === 'dashboard') return <DashboardView catalog={catalog} milestone={selected} onOpenRoute={() => setView('route')} onOpenEntity={openEntity} onOpenMap={() => setView('map')} onSelectMilestone={openMilestone} />;
    if (view === 'route') return <RouteView catalog={catalog} current={selected} onSelect={openMilestone} />;
    if (view === 'story') return <StoryView catalog={catalog} selectedEntityId={selectedEntityId} onOpenMap={openMapForEntity} onOpenEntity={openEntity} />;
    if (view === 'archive') return <ArchiveView catalog={catalog} selectedEntityId={selectedEntityId} onOpenMap={openMapForEntity} onOpenEntity={openEntity} />;
    if (view === 'crafting') return <CraftingView catalog={catalog} />;
    if (view === 'requests') return <RouteView catalog={{ ...catalog, milestones: catalog.milestones.filter((m) => m.kind === 'item_request') }} current={selected} onSelect={openMilestone} />;
    if (view === 'map') return <MapView catalog={catalog} currentMilestone={selected} focusEntityId={mapFocusEntityId} />;
    const config = ENTITY_VIEWS[view];
    if (config) return <EntityGridView catalog={catalog} {...config} selectedEntityId={selectedEntityId} onOpenMap={openMapForEntity} onOpenEntity={openEntity} />;
    return <ArchiveView catalog={catalog} selectedEntityId={selectedEntityId} onOpenMap={openMapForEntity} onOpenEntity={openEntity} />;
  }, [catalog, selected, view, selectedEntityId, mapFocusEntityId]);

  if (error) return <main className="fatal-screen"><h1>OUTLAW 100</h1><p>{error}</p></main>;
  if (!catalog || !progress.ready || !selected) return <main className="loading-screen"><div className="outlaw-mark">O</div><h1>Cargando el oeste entero…</h1><p>Son más de dos mil entidades. Rockstar tampoco lo hizo pequeño.</p></main>;
  return <AppShell view={view} onViewChange={(next) => { setView(next); if (next !== 'archive') setSelectedEntityId(null); }} onSearchHit={handleSearchHit} catalog={catalog} chapterLabel={String(selected.metadata?.editorialChapter ?? selected.chapter)} progressPercent={pct}>{page}</AppShell>;
}

export function OutlawApp({ userId }: { userId: string }) {
  return <ProgressProvider userId={userId}><LoadedApp /></ProgressProvider>;
}
