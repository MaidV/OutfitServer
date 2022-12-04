#include <mutex>
#include <unordered_map>

#include "json.hpp"
#include "outfit_server.h"

#include "mongoose.h"

using json = nlohmann::json;
using string = std::string;
using std::unordered_map;
using std::vector;
using namespace RE;

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

namespace keywordUtil
{
	std::mutex keyword_cache_lock;

	BGSKeyword* GetKeyword(const string& keywordname)
	{
		static std::unordered_map<string, BGSKeyword*> keyword_cache;

		keyword_cache_lock.lock();

		if (keyword_cache.empty()) {
			TESDataHandler* data_handler = TESDataHandler::GetSingleton();
			BSTArray<TESForm*> keywords = data_handler->GetFormArray(BGSKeyword::FORMTYPE);

			for (auto& keywordform : keywords) {
				BGSKeyword* keyword = keywordform->As<BGSKeyword>();
				keyword_cache[string(keyword->formEditorID)] = keyword;
			}
		}

		keyword_cache_lock.unlock();

		auto it = keyword_cache.find(keywordname);
		BGSKeyword* keyword = (it != keyword_cache.end()) ? it->second : NULL;
		return keyword;
	}

	bool HasKeywords(TESObjectARMO* form, std::vector<BGSKeyword*>& keywords)
	{
		if (form == nullptr)
			return false;

		for (BGSKeyword* keyword : keywords) {
			if (form->HasKeyword(keyword)) {
				return true;
			}
		}

		return false;
	}
}

void run_scripts(Actor* actor, vector<string> commands)
{
	const auto script_factory = RE::IFormFactory::GetConcreteFormFactoryByType<RE::Script>();
	const auto script = script_factory ? script_factory->Create() : nullptr;
	if (!script)
		return;
	for (auto& command : commands) {
		script->SetCommand(command);
		logger::info(script->GetCommand());
		script->CompileAndRun(actor);
	}
	delete script;
}

template <typename T, uint32_t L>
T mask_form(TESForm* form)
{
	uint32_t mask = 1;
	for (int i = 1; i <= L; ++i)
		mask *= 16;
	mask -= 1;

	const uint32_t masked = form->formID & mask;
	if constexpr (std::is_same_v<T, string>) {
		const string formatstr = "%0" + std::to_string(L) + "X";
		char formID[L + 1];
		sprintf_s(formID, L + 1, formatstr.c_str(), masked);
		return string(formID);
	} else {
		return masked;
	}
}

namespace ArticleNS
{
	Article::Article(TESObjectARMO* armor) :
		name(armor->GetFullName()),
		editorID(armor->GetFormEditorID()),
		formID(mask_form<int32_t, 6>(armor)),
		slots(static_cast<int32_t>(armor->GetSlotMask())),
		form(armor){};


	void from_json(const json& j, Article& a);
	void to_json(json& j, const Article& a);

	typedef unordered_map<string, unordered_map<string, ArticleNS::Article>> armor_record_t;
	typedef unordered_map<string, unordered_map<string, OutfitNS::Outfit>> transform_t;
	armor_record_t armor_map;
	transform_t transform_map;

	void LoadArmors()
	{
		if (!armor_map.empty())
			return;

		TESDataHandler* data_handler = TESDataHandler::GetSingleton();
		armor_map.clear();
		logger::info("Loading armor from mods");
		bool ignore_skin = true;
		bool playable = true;
		bool ignore_templates = true;
		bool ignore_enchantments = true;
		bool only_enchanted = false;

		std::set<TESObjectARMO*> exclude;
		if (ignore_skin) {
			logger::info("LoadArmors: Filtering out skins");
			BSTArray<TESForm*> races = data_handler->GetFormArray(TESRace::FORMTYPE);

			for (auto& raceform : races) {
				const auto& race = static_cast<TESRace*>(raceform);
				if (race->skin) {
					exclude.insert(race->skin);
				}
			}

			BSTArray<TESForm*> npcs = data_handler->GetFormArray(TESNPC::FORMTYPE);
			for (auto& npcform : npcs) {
				const auto& npc = static_cast<TESNPC*>(npcform);
				if (npc->skin) {
					exclude.insert(npc->skin);
				}
			}
		}

		std::vector<BGSKeyword*> badKeywords = {
			keywordUtil::GetKeyword("zad_InventoryDevice"),
			keywordUtil::GetKeyword("zad_Lockable")
		};

		logger::info("LoadArmors: Looping through armors");
		BSTArray<TESForm*>& armors = data_handler->GetFormArray(TESObjectARMO::FORMTYPE);
		for (TESForm* armorform : armors) {
			TESObjectARMO* armor = static_cast<TESObjectARMO*>(armorform);
			logger::debug("Checking armor " + string(armor->GetFullName()));
			if (ignore_skin && exclude.contains(armor)) {
				logger::debug("Excluding armor due to skin");
				continue;
			}
			if (playable != armor->GetPlayable()) {
				logger::debug("Excluding armor due to not playable");
				continue;
			}
			if (ignore_templates && armor->templateArmor) {
				logger::debug("Excluding armor due to template");
				continue;
			}
			if (ignore_enchantments && armor->formEnchanting) {
				logger::debug("Excluding armor due to enchantment");
				continue;
			}
			if (only_enchanted && !armor->formEnchanting) {
				logger::debug("Excluding armor due to requiring enchantments");
				continue;
			}
			if (keywordUtil::HasKeywords(armor, badKeywords)) {
				logger::debug("Excluding armor due to having bad keywords");
				continue;
			}
			if (!strlen(armor->GetFullName())) {
				logger::debug("Excluding armor due to not having a name");
				continue;
			}
			logger::debug("Adding new armor to map: " + string(armor->GetFullName()));

			ArticleNS::Article article(armor);
			logger::debug("Created new Article: " + json(article).dump(-1, ' ', false, json::error_handler_t::ignore));
			armor_map[armor->GetFile()->fileName][mask_form<string, 6>(article.form)] = article;
		}

		logger::info("Loaded all armors into Armor Map");
		std::ofstream out;
		out.open("YEAHHHHH.json");
		logger::info("Opened dump file");
		out << json(armor_map).dump(4, ' ', false, json::error_handler_t::ignore);
		logger::info("Finished dump");
	}

	void LoadTransforms()
	{
		if (!transform_map.empty())
			return;

		transform_map["Dawnguard.esm"]["0023E9"] = OutfitNS::Outfit{
			"Outfit 0", {
							armor_map["Dawnguard.esm"]["0071E1"],
						}
		};
	};

	void TransformArmor(Actor* actor, TESObjectARMO* armor)
	{
		LoadArmors();
		LoadTransforms();

		string file = armor->GetFile()->fileName;
		string form = mask_form<string, 6>(armor);

		if (!transform_map.count(file) || !transform_map[file].count(form)) {
			spdlog::warn("(" + file + ", " + form + ") not in Transform map");
			return;
		}
		spdlog::warn("(" + file + ", " + form + ") FOUND OMG");

		auto target = actor->AsReference();
		const auto inv = target->GetInventory([](TESBoundObject& a_object) {
			return a_object.IsArmor();
		});

		for (const auto& [item, invData] : inv) {
			const auto& [count, entry] = invData;
			bool done = false;
			if (count > 0 && entry->IsWorn() && (entry->object == armor)) {
				for (const auto& xList : *entry->extraLists) {
					if (!xList)
						continue;
					logger::info("Removing item {}"sv, item->GetName());
					ActorEquipManager::GetSingleton()->UnequipObject(target->As<Actor>(), item, xList);
					target->RemoveItem(item, 1, ITEM_REMOVE_REASON::kRemove, xList, nullptr);
					done = true;
					break;
				}
			}
			if (done)
				break;
		}
	}

	armor_record_t& GetLoadedArmors()
	{
		return ArticleNS::armor_map;
	};

	void AddItem(Actor* actor, std::vector<TESForm*>& forms, int32_t count = 1, bool silent = false)
	{
		vector<string> commands;
		for (auto& form : forms)
			commands.push_back("additem " +
							   mask_form<string, 8>(form) + " " +
							   std::to_string(count) + " " +
							   std::to_string(silent));
		run_scripts(actor, commands);
	}

	void from_json(const json& j, Article& a)
	{
		string mod = j.at("mod");
		string formID = j.at("formID");
		logger::info("Article: " + mod + " " + formID);
		a = Article(armor_map[mod][formID]);
	}

	void to_json(json& j, const Article& a)
	{
		std::vector<uint8_t> slots;
		for (int32_t i = 0; i < 32; ++i) {
			if (a.slots >> i & 1)
				slots.push_back((uint8_t)(i + 30));
		}
		j = json{
			{ "name", a.name },
			{ "formID", mask_form<string, 6>(a.form) },
			{ "editorID", a.editorID },
			{ "slots", slots }
		};
	}
}

namespace OutfitNS
{
	std::unordered_map<string, Outfit> outfit_map;

	void from_json(const json& j, Outfit& o);
	void to_json(json& j, const Outfit& o);

	void TryOutfit(Actor* actor, OutfitNS::Outfit& outfit, bool unequip = true)
	{
		ActorEquipManager* equip_manager = ActorEquipManager::GetSingleton();

		if (unequip)
			run_scripts(actor, { "unequipall" });

		std::vector<TESForm*> to_equip;
		to_equip.reserve(outfit.articles.size());
		for (ArticleNS::Article& article : outfit.articles) {
			to_equip.push_back(article.form);
		}
		ArticleNS::AddItem(actor, to_equip, 1);

		for (auto& armor : to_equip)
			equip_manager->EquipObject(actor, static_cast<TESObjectARMO*>(armor), nullptr, 1);
	}

	void TryOutfit(Actor* actor, const char* outfit_str, bool unequip = true)
	{
		try {
			Outfit outfit = json::parse(outfit_str);
			TryOutfit(actor, outfit, unequip);
		} catch (...) {
			logger::info("Failed to init Outfit from json.");
		}
	}

	void from_json(const json& j, Outfit& o)
	{
		j.at("name").get_to(o.name);
		j.at("articles").get_to(o.articles);
		outfit_map[o.name] = o;
	}

	void to_json(json& j, const Outfit& o)
	{
		j = json{
			{ "name", o.name },
			{ "articles", o.articles }
		};
	}
}

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
			logger::info(outfit_str.c_str());

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
