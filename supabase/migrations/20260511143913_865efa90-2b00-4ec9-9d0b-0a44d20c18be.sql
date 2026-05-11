
CREATE TABLE public.discernment_conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.discernment_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own conversations" ON public.discernment_conversations
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own conversations" ON public.discernment_conversations
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own conversations" ON public.discernment_conversations
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users delete own conversations" ON public.discernment_conversations
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER update_discernment_conversations_updated_at
  BEFORE UPDATE ON public.discernment_conversations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.discernment_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.discernment_conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user','assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.discernment_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own messages" ON public.discernment_messages
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own messages" ON public.discernment_messages
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own messages" ON public.discernment_messages
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX idx_discernment_messages_conv ON public.discernment_messages(conversation_id, created_at);
CREATE INDEX idx_discernment_conv_user ON public.discernment_conversations(user_id, updated_at DESC);
