#include <mutex>
#include <unordered_map>

#include "json.hpp"
#include "outfit.hpp"
#include "outfit_server.h"

#include "mongoose.h"

using json = nlohmann::json;
using string = std::string;
using std::unordered_map;
using std::vector;
using namespace RE;

/* 
namespace Events
{
	class BreakEventManager : public RE::BSTEventSink<TESHitEvent>, BSTEventSink<TESEquipEvent>
	{
	public:
		[[nodiscard]] static BreakEventManager* GetSingleton()
		{
			static BreakEventManager singleton;
			return std::addressof(singleton);
		}

		static void Register()
		{
			auto scripts = ScriptEventSourceHolder::GetSingleton();
			if (scripts) {
				scripts->AddEventSink<TESHitEvent>(GetSingleton());
				logger::info("Registered {}"sv, typeid(RE::TESHitEvent).name());
				scripts->AddEventSink<TESEquipEvent>(GetSingleton());
				logger::info("Registered {}"sv, typeid(RE::TESEquipEvent).name());
			}
		}

	protected:
		using EventResult = RE::BSEventNotifyControl;

		EventResult ProcessEvent(const TESHitEvent* a_event, RE::BSTEventSource<TESHitEvent>*) override
		{
			if (a_event && a_event->target)
				return Evaluate(a_event->target);

			return EventResult::kContinue;
		}

		EventResult ProcessEvent(const TESEquipEvent* a_event, BSTEventSource<TESEquipEvent>*) override
		{
			if (a_event && a_event->equipped && a_event->actor) {
				return Evaluate(a_event->actor);
			}
			return EventResult::kContinue;
		}

	private:
		BreakEventManager() = default;
		BreakEventManager(const BreakEventManager&) = delete;
		BreakEventManager(BreakEventManager&&) = delete;

		EventResult Evaluate(TESObjectREFRPtr targetPtr)
		{
			auto target = targetPtr->AsReference();
			const auto inv = target->GetInventory([](TESBoundObject& a_object) {
				return a_object.IsArmor();
			});

			for (const auto& [item, invData] : inv) {
				const auto& [count, entry] = invData;
				if (count > 0 && entry->IsWorn()) {
					for (const auto& xList : *entry->extraLists) {
						if (xList) {
							auto xHealth = xList->GetByType<ExtraHealth>();
							if (xHealth && xHealth->health <= 0.1f) {
								logger::info("Removing item {}"sv, item->GetName());
								ActorEquipManager::GetSingleton()->UnequipObject(target->As<Actor>(), item, xList);
								target->RemoveItem(item, 1, ITEM_REMOVE_REASON::kRemove, xList, nullptr);
								break;
							}
						}
					}
				}
			}

			return EventResult::kContinue;
		}

		~BreakEventManager() = default;

		BreakEventManager& operator=(const BreakEventManager&) = delete;
		BreakEventManager& operator=(BreakEventManager&&) = delete;
	};

	void Register()
	{
		BreakEventManager::Register();
		logger::info("Registered all event handlers"sv);
	}
}
 */

static void cb(struct mg_connection* c, int ev, void* ev_data, void*)
{
	const char* s_web_root_dir = "data/outfitmanager";
	if (ev == MG_EV_HTTP_MSG) {
		struct mg_http_message* hm = static_cast<mg_http_message*>(ev_data);
		ArticleNS::LoadArmors();

		if (mg_vcmp(&hm->uri, "/LoadArmorData") == 0) {
			logger::info("LoadArmorData Request received");
			auto& armors = ArticleNS::GetLoadedArmors();
			mg_http_reply(c,
				200,
				"Content-Type: application/json; charset=utf-8\r\nAccess-Control-Allow-Origin: *\r\n",
				json(armors).dump(-1, ' ', false, json::error_handler_t::ignore).c_str());

			return;
		} else if (mg_vcmp(&hm->uri, "/TryOutfit") == 0) {
			logger::info("TryOutfit Request received");
			const char* data = static_cast<const char*>(hm->body.ptr);
			const size_t len = hm->body.len;
			string outfit_str;
			outfit_str.reserve(len + 1);
			for (int i = 0; i < len; ++i)
				outfit_str[i] = data[i];
			outfit_str[len] = '\0';
			logger::info("{}"sv, outfit_str.c_str());

			OutfitNS::TryOutfit(PlayerCharacter::GetSingleton(), outfit_str.c_str());

			mg_http_reply(c, 200, "Access-Control-Allow-Origin: *\r\n", "");
			return;
		}

		struct mg_http_serve_opts opts = { s_web_root_dir, NULL };
		mg_http_serve_dir(c, hm, &opts);
	}
}

void outfit_server(const int& port, const bool& local_only)
{
	struct mg_mgr mgr;
	mg_mgr_init(&mgr);
	std::string listening_address = (local_only ? "http://localhost:" : "http://0.0.0.0:") + std::to_string(port);
	mg_http_listen(&mgr, listening_address.c_str(), cb, &mgr);
	while (true)
		mg_mgr_poll(&mgr, 1000);
	mg_mgr_free(&mgr);
}
