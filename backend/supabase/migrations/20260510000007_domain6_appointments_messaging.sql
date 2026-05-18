-- ============================================================
-- Domain 6: Appointments & Messaging
-- appointment_slots, appointments, appointment_dresses,
-- conversations, messages
-- NOTE: depends on vendors (Domain 7) which runs before this file
-- ============================================================

-- ── appointment_slots ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.appointment_slots (
  id            uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
  boutique_id   uuid        NOT NULL REFERENCES public.boutiques(id) ON DELETE CASCADE,
  slot_date     date        NOT NULL,
  slot_time     time        NOT NULL,
  capacity      int         NOT NULL DEFAULT 1,
  booked_count  int         NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (boutique_id, slot_date, slot_time)
);

ALTER TABLE public.appointment_slots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "appointment_slots_select_authenticated"
  ON public.appointment_slots FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "appointment_slots_write_owner"
  ON public.appointment_slots FOR ALL
  USING (EXISTS (SELECT 1 FROM public.boutiques b WHERE b.id = boutique_id AND b.owner_user_id = auth.uid()));

-- ── appointments ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.appointments (
  id                    uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
  boutique_id           uuid        NOT NULL REFERENCES public.boutiques(id),
  user_id               uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  slot_id               uuid        NOT NULL REFERENCES public.appointment_slots(id),
  status                text        NOT NULL DEFAULT 'pending'
                          CHECK (status IN ('pending','confirmed','cancelled_by_bride','cancelled_by_boutique')),
  full_name             text        NOT NULL,
  phone                 text        NOT NULL,
  special_request       text,
  try_multiple_dresses  boolean     NOT NULL DEFAULT false,
  guest_count           int         NOT NULL DEFAULT 0,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "appointments_select_user"
  ON public.appointments FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "appointments_select_boutique_owner"
  ON public.appointments FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.boutiques b WHERE b.id = boutique_id AND b.owner_user_id = auth.uid()));

CREATE POLICY "appointments_insert_user"
  ON public.appointments FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "appointments_update_boutique_owner"
  ON public.appointments FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.boutiques b WHERE b.id = boutique_id AND b.owner_user_id = auth.uid()));

-- ── appointment_dresses ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.appointment_dresses (
  id                  uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
  appointment_id      uuid        NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  boutique_dress_id   uuid        NOT NULL REFERENCES public.boutique_dresses(id),
  created_at          timestamptz NOT NULL DEFAULT now(),
  UNIQUE (appointment_id, boutique_dress_id)
);

ALTER TABLE public.appointment_dresses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "appointment_dresses_select_participant"
  ON public.appointment_dresses FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.appointments a
    WHERE a.id = appointment_id
      AND (a.user_id = auth.uid()
        OR EXISTS (SELECT 1 FROM public.boutiques b WHERE b.id = a.boutique_id AND b.owner_user_id = auth.uid()))
  ));

CREATE POLICY "appointment_dresses_write_user"
  ON public.appointment_dresses FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.appointments a WHERE a.id = appointment_id AND a.user_id = auth.uid()
  ));

-- ── conversations ─────────────────────────────────────────────
-- participant_type determines whether boutique_id or vendor_id is set
CREATE TABLE IF NOT EXISTS public.conversations (
  id                uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id           uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  participant_type  text        NOT NULL CHECK (participant_type IN ('boutique','vendor')),
  boutique_id       uuid        REFERENCES public.boutiques(id) ON DELETE CASCADE,
  vendor_id         uuid        REFERENCES public.vendors(id) ON DELETE CASCADE,
  last_message_at   timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

-- Partial unique indexes enforce one conversation per user per boutique/vendor
CREATE UNIQUE INDEX IF NOT EXISTS uq_conversations_user_boutique
  ON public.conversations(user_id, boutique_id) WHERE boutique_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_conversations_user_vendor
  ON public.conversations(user_id, vendor_id) WHERE vendor_id IS NOT NULL;

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "conversations_select_participant"
  ON public.conversations FOR SELECT
  USING (
    auth.uid() = user_id
    OR EXISTS (SELECT 1 FROM public.boutiques b WHERE b.id = boutique_id AND b.owner_user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.vendors v WHERE v.id = vendor_id AND v.owner_user_id = auth.uid())
  );

CREATE POLICY "conversations_insert_user"
  ON public.conversations FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "conversations_update_participant"
  ON public.conversations FOR UPDATE
  USING (
    auth.uid() = user_id
    OR EXISTS (SELECT 1 FROM public.boutiques b WHERE b.id = boutique_id AND b.owner_user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.vendors v WHERE v.id = vendor_id AND v.owner_user_id = auth.uid())
  );

-- ── messages ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.messages (
  id                uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id   uuid        NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_user_id    uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message_type      text        NOT NULL CHECK (message_type IN ('text','image')),
  content           text        NOT NULL,
  is_read           boolean     NOT NULL DEFAULT false,
  created_at        timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "messages_select_participant"
  ON public.messages FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id = conversation_id
      AND (c.user_id = auth.uid()
        OR EXISTS (SELECT 1 FROM public.boutiques b WHERE b.id = c.boutique_id AND b.owner_user_id = auth.uid())
        OR EXISTS (SELECT 1 FROM public.vendors v WHERE v.id = c.vendor_id AND v.owner_user_id = auth.uid()))
  ));

CREATE POLICY "messages_insert_participant"
  ON public.messages FOR INSERT
  WITH CHECK (
    auth.uid() = sender_user_id
    AND EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = conversation_id
        AND (c.user_id = auth.uid()
          OR EXISTS (SELECT 1 FROM public.boutiques b WHERE b.id = c.boutique_id AND b.owner_user_id = auth.uid())
          OR EXISTS (SELECT 1 FROM public.vendors v WHERE v.id = c.vendor_id AND v.owner_user_id = auth.uid()))
    )
  );

-- ── indexes ──────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_appointments_user      ON public.appointments(user_id);
CREATE INDEX IF NOT EXISTS idx_appointments_boutique  ON public.appointments(boutique_id);
CREATE INDEX IF NOT EXISTS idx_appointments_status    ON public.appointments(status);
CREATE INDEX IF NOT EXISTS idx_conversations_user     ON public.conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation  ON public.messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_unread        ON public.messages(conversation_id) WHERE is_read = false;
