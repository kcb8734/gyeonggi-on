ALTER TABLE center_local_courses ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending';
CREATE INDEX IF NOT EXISTS idx_center_local_courses_status ON center_local_courses(status);
UPDATE center_local_courses SET status = 'approved' WHERE id = 'course-suwon-seed' AND status IS DISTINCT FROM 'approved';

CREATE TABLE IF NOT EXISTS center_course_passwords (
    center_id TEXT PRIMARY KEY,
    password_hash TEXT NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
