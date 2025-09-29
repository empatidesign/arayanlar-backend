-- Chat_messages tablosuna sohbet silme özelliği için sütunlar ekle
ALTER TABLE chat_messages 
ADD COLUMN IF NOT EXISTS deleted_by_sender BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS deleted_by_receiver BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS sender_deleted_at TIMESTAMP NULL,
ADD COLUMN IF NOT EXISTS receiver_deleted_at TIMESTAMP NULL;

-- İndeksler ekle
CREATE INDEX IF NOT EXISTS idx_chat_deleted_sender ON chat_messages(deleted_by_sender);
CREATE INDEX IF NOT EXISTS idx_chat_deleted_receiver ON chat_messages(deleted_by_receiver);
CREATE INDEX IF NOT EXISTS idx_chat_sender_not_deleted ON chat_messages(sender_id) WHERE deleted_by_sender = FALSE;
CREATE INDEX IF NOT EXISTS idx_chat_receiver_not_deleted ON chat_messages(receiver_id) WHERE deleted_by_receiver = FALSE;

-- Yorumlar
COMMENT ON COLUMN chat_messages.deleted_by_sender IS 'Mesajı gönderen kullanıcının sohbeti silip silmediği';
COMMENT ON COLUMN chat_messages.deleted_by_receiver IS 'Mesajı alan kullanıcının sohbeti silip silmediği';
COMMENT ON COLUMN chat_messages.sender_deleted_at IS 'Gönderen kullanıcının sohbeti sildiği tarih';
COMMENT ON COLUMN chat_messages.receiver_deleted_at IS 'Alan kullanıcının sohbeti sildiği tarih';