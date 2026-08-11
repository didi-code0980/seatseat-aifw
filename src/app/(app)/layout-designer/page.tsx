import { EmptyState } from "@/components/shared/EmptyState";
import { layout } from "@/lib/data";

// Read-only grid preview. Drag and drop is LAY work and belongs to a ticket with a design; dnd-kit
// is installed but deliberately not wired here, because a half-built interaction is harder to
// replace than an empty frame.
export default async function LayoutDesignerPage() {
  const layouts = await layout.listRoomLayouts();

  return (
    <section data-testid="layout-designer-page">
      <h1 className="mb-6 text-2xl font-semibold tracking-tight">Layout designer</h1>

      {layouts.length === 0 ? (
        <EmptyState message="No rooms to lay out." data-testid="layout-designer-empty" />
      ) : (
        <div className="space-y-8">
          {layouts.map(({ room, seats }) => (
            <div key={room.id} data-testid={`layout-room-${room.id}`}>
              <h2 className="mb-3 text-sm font-medium">
                <span className="code">{room.code}</span> — {room.name}
              </h2>
              <div
                className="grid gap-1 rounded-xl border border-border bg-surface p-3"
                style={{
                  gridTemplateColumns: `repeat(${room.gridWidth}, minmax(0, 1fr))`,
                  gridTemplateRows: `repeat(${room.gridHeight}, 12px)`,
                }}
              >
                {seats.map((seat) => (
                  <div
                    key={seat.id}
                    data-testid={`layout-seat-${seat.id}`}
                    title={seat.code}
                    className="rounded bg-ink/85"
                    style={{
                      gridColumn: `${seat.gridX + 1} / span ${seat.gridW}`,
                      gridRow: `${seat.gridY + 1} / span ${seat.gridH}`,
                    }}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
