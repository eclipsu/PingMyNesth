ALTER TABLE verification_tokens DROP CONSTRAINT verification_tokens_user_id_fkey,
    ADD CONSTRAINT verification_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id);
ALTER TABLE watches DROP CONSTRAINT watches_user_id_fkey,
    ADD CONSTRAINT watches_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id);
DROP TABLE usm_traffic;
DROP TABLE seat_events;
DROP TABLE poll_cycles;
