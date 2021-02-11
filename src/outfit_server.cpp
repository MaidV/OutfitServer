#include "mongoose.h"

static const char* s_web_root_dir = "data/outfitmanager";
static const char* s_listening_address = "http://localhost:8000";

static void cb(struct mg_connection* c, int ev, void* ev_data, void*)
{
	if (ev == MG_EV_HTTP_MSG) {
		struct mg_http_message* hm = static_cast<mg_http_message*>(ev_data);

		if (mg_vcmp(&hm->uri, "/UpdateOutfit") == 0) {
			logger::info("UpdateOutfit Request received");
			mg_http_reply(c, 200, "", "");

			return;
		}

		struct mg_http_serve_opts opts = { s_web_root_dir, NULL };
		mg_http_serve_dir(c, hm, &opts);
		//mg_http_serve_file(c, hm, (web_root + string(hm->uri)).c_str(), "text/html", "");
	}
}

void outfit_server()
{
	struct mg_mgr mgr;
	mg_mgr_init(&mgr);
	mg_http_listen(&mgr, s_listening_address, cb, &mgr);
	while (true)
		mg_mgr_poll(&mgr, 1000);
	mg_mgr_free(&mgr);
}
