// Table types for the Supabase data adapter. ADR-007 OQ-2.
//
// COMMITTED, AND READ FROM THE REPOSITORY RATHER THAN FETCHED. That is the whole point of the
// decision: `pnpm typecheck` needs a checkout and nothing else (AC-8), and CI needs no database
// credential. The network requirement moves from every type-check to every schema change, which is
// the correct place for it.
//
// GENERATED FROM THE MIGRATIONS, NOT FROM THE CLOUD PROJECT:
//
//     pnpm supabase db reset            # applies supabase/migrations/ to the CLI's local stack
//     pnpm db:types                     # supabase gen types typescript --local > this file
//
// Types generated from the linked project would describe whatever that project currently holds,
// which is not necessarily what the migrations say — and with ONE Supabase project
// (`ticket.yaml` precondition 2) a hand-edit in the dashboard would propagate in here with nothing
// to catch it. `.github/workflows/verify.yml` regenerates and DIFFS; a difference fails the run and
// must never rewrite this file.
//
// TODO(verify): THIS FILE IS HAND-AUTHORED AGAINST `supabase/migrations/20260826094134_init.sql`
// AND HAS NOT YET BEEN PRODUCED BY THE GENERATOR. It could not be: `supabase gen types --local`
// needs the CLI's Postgres stack, that stack runs in Docker, and no container runtime is installed
// on this machine — and the migration itself is unapplied pending the RULE-09 signature, which is
// this ticket's one human stop. Regenerate it with the two commands above at the moment the
// migration is first applied, and commit whatever comes out. Expect cosmetic differences the
// generator owns and this file cannot predict — key order, a `__InternalSupabase.PostgrestVersion`
// stamp, and the exact `Relationships` rows. The CI job is what will say so, which is the job
// working. **Only the `Database` type is depended on**, by `src/lib/data/supabase/client.ts` and by
// nothing else, so a regeneration that changes the surrounding aliases costs nothing.

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      Account: {
        Row: {
          auth_user_id: string | null;
          createdAt: string;
          createdById: string | null;
          email: string;
          id: string;
          memberId: string;
          updatedAt: string;
        };
        Insert: {
          auth_user_id?: string | null;
          createdAt?: string;
          createdById?: string | null;
          email: string;
          id?: string;
          memberId: string;
          updatedAt?: string;
        };
        Update: {
          auth_user_id?: string | null;
          createdAt?: string;
          createdById?: string | null;
          email?: string;
          id?: string;
          memberId?: string;
          updatedAt?: string;
        };
        Relationships: [
          {
            foreignKeyName: "Account_createdById_fkey";
            columns: ["createdById"];
            isOneToOne: false;
            referencedRelation: "Member";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "Account_memberId_fkey";
            columns: ["memberId"];
            isOneToOne: true;
            referencedRelation: "Member";
            referencedColumns: ["id"];
          },
        ];
      };
      Device: {
        Row: {
          assetTag: string;
          createdAt: string;
          id: string;
          model: string;
          ownerId: string | null;
          rank: Database["public"]["Enums"]["DeviceRank"];
          seatId: string | null;
          updatedAt: string;
        };
        Insert: {
          assetTag: string;
          createdAt?: string;
          id?: string;
          model: string;
          ownerId?: string | null;
          rank?: Database["public"]["Enums"]["DeviceRank"];
          seatId?: string | null;
          updatedAt?: string;
        };
        Update: {
          assetTag?: string;
          createdAt?: string;
          id?: string;
          model?: string;
          ownerId?: string | null;
          rank?: Database["public"]["Enums"]["DeviceRank"];
          seatId?: string | null;
          updatedAt?: string;
        };
        Relationships: [
          {
            foreignKeyName: "Device_ownerId_fkey";
            columns: ["ownerId"];
            isOneToOne: false;
            referencedRelation: "Member";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "Device_seatId_fkey";
            columns: ["seatId"];
            isOneToOne: false;
            referencedRelation: "Seat";
            referencedColumns: ["id"];
          },
        ];
      };
      Group: {
        Row: {
          id: string;
          name: string;
          parentId: string | null;
        };
        Insert: {
          id?: string;
          name: string;
          parentId?: string | null;
        };
        Update: {
          id?: string;
          name?: string;
          parentId?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "Group_parentId_fkey";
            columns: ["parentId"];
            isOneToOne: false;
            referencedRelation: "Group";
            referencedColumns: ["id"];
          },
        ];
      };
      Member: {
        Row: {
          createdAt: string;
          email: string;
          fullName: string;
          groupId: string | null;
          id: string;
          role: Database["public"]["Enums"]["Role"];
          updatedAt: string;
        };
        Insert: {
          createdAt?: string;
          email: string;
          fullName: string;
          groupId?: string | null;
          id?: string;
          role?: Database["public"]["Enums"]["Role"];
          updatedAt?: string;
        };
        Update: {
          createdAt?: string;
          email?: string;
          fullName?: string;
          groupId?: string | null;
          id?: string;
          role?: Database["public"]["Enums"]["Role"];
          updatedAt?: string;
        };
        Relationships: [
          {
            foreignKeyName: "Member_groupId_fkey";
            columns: ["groupId"];
            isOneToOne: false;
            referencedRelation: "Group";
            referencedColumns: ["id"];
          },
        ];
      };
      NetworkPort: {
        Row: {
          id: string;
          portCode: string;
          seatId: string;
        };
        Insert: {
          id?: string;
          portCode: string;
          seatId: string;
        };
        Update: {
          id?: string;
          portCode?: string;
          seatId?: string;
        };
        Relationships: [
          {
            foreignKeyName: "NetworkPort_seatId_fkey";
            columns: ["seatId"];
            isOneToOne: false;
            referencedRelation: "Seat";
            referencedColumns: ["id"];
          },
        ];
      };
      Room: {
        Row: {
          code: string;
          createdAt: string;
          gridHeight: number;
          gridWidth: number;
          id: string;
          name: string;
          updatedAt: string;
        };
        Insert: {
          code: string;
          createdAt?: string;
          gridHeight: number;
          gridWidth: number;
          id?: string;
          name: string;
          updatedAt?: string;
        };
        Update: {
          code?: string;
          createdAt?: string;
          gridHeight?: number;
          gridWidth?: number;
          id?: string;
          name?: string;
          updatedAt?: string;
        };
        Relationships: [];
      };
      Seat: {
        Row: {
          code: string;
          createdAt: string;
          gridH: number;
          gridW: number;
          gridX: number;
          gridY: number;
          id: string;
          occupantId: string | null;
          roomId: string;
          updatedAt: string;
        };
        Insert: {
          code: string;
          createdAt?: string;
          gridH: number;
          gridW: number;
          gridX: number;
          gridY: number;
          id?: string;
          occupantId?: string | null;
          roomId: string;
          updatedAt?: string;
        };
        Update: {
          code?: string;
          createdAt?: string;
          gridH?: number;
          gridW?: number;
          gridX?: number;
          gridY?: number;
          id?: string;
          occupantId?: string | null;
          roomId?: string;
          updatedAt?: string;
        };
        Relationships: [
          {
            foreignKeyName: "Seat_occupantId_fkey";
            columns: ["occupantId"];
            isOneToOne: false;
            referencedRelation: "Member";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "Seat_roomId_fkey";
            columns: ["roomId"];
            isOneToOne: false;
            referencedRelation: "Room";
            referencedColumns: ["id"];
          },
        ];
      };
      SeatRequest: {
        Row: {
          createdAt: string;
          id: string;
          kind: Database["public"]["Enums"]["RequestKind"];
          requesterId: string;
          roomId: string;
          seatId: string | null;
          state: Database["public"]["Enums"]["RequestState"];
          updatedAt: string;
        };
        Insert: {
          createdAt?: string;
          id?: string;
          kind: Database["public"]["Enums"]["RequestKind"];
          requesterId: string;
          roomId: string;
          seatId?: string | null;
          state?: Database["public"]["Enums"]["RequestState"];
          updatedAt?: string;
        };
        Update: {
          createdAt?: string;
          id?: string;
          kind?: Database["public"]["Enums"]["RequestKind"];
          requesterId?: string;
          roomId?: string;
          seatId?: string | null;
          state?: Database["public"]["Enums"]["RequestState"];
          updatedAt?: string;
        };
        Relationships: [
          {
            foreignKeyName: "SeatRequest_requesterId_fkey";
            columns: ["requesterId"];
            isOneToOne: false;
            referencedRelation: "Member";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "SeatRequest_roomId_fkey";
            columns: ["roomId"];
            isOneToOne: false;
            referencedRelation: "Room";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "SeatRequest_seatId_fkey";
            columns: ["seatId"];
            isOneToOne: false;
            referencedRelation: "Seat";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      assign_seat_occupant: {
        Args: { p_seat_id: string; p_member_id: string };
        Returns: Json;
      };
      delete_group: {
        Args: { p_group_id: string };
        Returns: Json;
      };
      delete_member: {
        Args: { p_member_id: string };
        Returns: Json;
      };
      delete_room: {
        Args: { p_room_id: string };
        Returns: Json;
      };
      designate_primary_device: {
        Args: { p_device_id: string };
        Returns: Json;
      };
      device_dto: {
        Args: { p_device_id: string };
        Returns: Json;
      };
      release_seat_occupant: {
        Args: { p_seat_id: string };
        Returns: Json;
      };
      seat_dto: {
        Args: { p_seat_id: string };
        Returns: Json;
      };
    };
    Enums: {
      DeviceRank: "PRIMARY" | "SECONDARY";
      RequestKind: "TARGETED" | "OPEN";
      RequestState: "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";
      Role: "USER" | "MANAGER" | "ADMIN";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};
