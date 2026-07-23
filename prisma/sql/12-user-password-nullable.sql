SET search_path TO creator_engine;
ALTER TABLE "User" ALTER COLUMN password DROP NOT NULL;
