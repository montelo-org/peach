import os
from dotenv import load_dotenv
from supabase import create_client, Client


###########################################################################
# load env vars
###########################################################################
load_dotenv()

supabase: Client = create_client(
    os.environ.get("SUPABASE_URL"),
    os.environ.get("SUPABASE_KEY"),
)


# this will update the record in the db, which then updates the frontend
def db_update_state(new_state: str) -> None:
    user_id = os.getenv("SUPABASE_ID")
    supabase.table("events").update({"state": new_state}).eq("id", user_id).execute()
