#include <mutex>
#include <unordered_map>

#include "json.hpp"

#include "mongoose.h"

using json = nlohmann::json;
using std::string;
using std::unordered_map;
using std::vector;
using namespace RE;

namespace keywordUtil
{
	std::mutex s_keywordCacheLock;

	BGSKeyword* GetKeyword(const string& keywordname)
	{
		static std::unordered_map<string, BGSKeyword*> s_keywordCache;

		s_keywordCacheLock.lock();

		if (s_keywordCache.empty()) {
			TESDataHandler* dataHandler = TESDataHandler::GetSingleton();
			BSTArray<TESForm*> keywords = dataHandler->GetFormArray(BGSKeyword::FORMTYPE);

			for (auto& keywordform : keywords) {
				BGSKeyword* keyword = keywordform->As<BGSKeyword>();
				s_keywordCache[string(keyword->formEditorID)] = keyword;
			}
		}

		s_keywordCacheLock.unlock();

		auto it = s_keywordCache.find(keywordname);
		BGSKeyword* keyword = (it != s_keywordCache.end()) ? it->second : NULL;
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
	struct Article
	{
		string name;
		int32_t formID;
		vector<uint8_t> slots;
		TESObjectARMO* form;

		Article(){};

		Article(TESObjectARMO* armor) :
			name(armor->GetFullName()), formID(mask_form<int32_t, 6>(armor)), form(armor){};
	};

	void to_json(json& j, const Article& a)
	{
		j = json{
			{ "name", a.name },
			{ "formID", mask_form<string, 6>(a.form) },
			{ "slots", a.slots }
		};
	}

	void from_json(const json& j, Article& a)
	{
		j.at("name").get_to(a.name);
		a.formID = strtol(string(j.at("formID")).c_str(), NULL, 16);
		j.at("slots").get_to(a.slots);
	}
}

namespace OutfitNS
{
	struct Outfit
	{
	};
}

typedef unordered_map<string, unordered_map<string, ArticleNS::Article>> armor_record_t;
armor_record_t armorRecords;

namespace SluttifyArmor
{
	void AddItem(Actor* actor, std::vector<TESForm*>& forms, int32_t count = 1, bool silent = false)
	{
		const auto scriptFactory = RE::IFormFactory::GetConcreteFormFactoryByType<RE::Script>();
		const auto script = scriptFactory ? scriptFactory->Create() : nullptr;
		if (script) {
			for (auto& form : forms) {
				script->SetCommand("additem " +
								   mask_form<string, 8>(form) + " " +
								   std::to_string(count) + " " +
								   std::to_string(silent));
				logger::info(script->GetCommand());
				script->CompileAndRun(actor);
			}
			delete script;
		}
	}

	void LoadArmors()
	{
		if (!armorRecords.empty())
			return;

		TESDataHandler* dataHandler = TESDataHandler::GetSingleton();
		armorRecords.clear();
		logger::info("Loading armor from mods");
		bool ignoreSkin = true;
		bool playable = true;
		bool ignoreTemplates = true;
		bool ignoreEnchantments = true;
		bool onlyEnchanted = false;

		std::set<TESObjectARMO*> exclude;
		if (ignoreSkin) {
			BSTArray<TESForm*> races = dataHandler->GetFormArray(TESRace::FORMTYPE);

			for (auto& raceform : races) {
				const auto& race = static_cast<TESRace*>(raceform);
				if (race->skin) {
					exclude.insert(race->skin);
				}
			}

			BSTArray<TESForm*> npcs = dataHandler->GetFormArray(TESNPC::FORMTYPE);
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

		BSTArray<TESForm*>& armors = dataHandler->GetFormArray(TESObjectARMO::FORMTYPE);
		for (TESForm* armorform : armors) {
			TESObjectARMO* armor = static_cast<TESObjectARMO*>(armorform);
			logger::debug("Checking armor " + string(armor->GetFullName()));
			if (ignoreSkin && exclude.contains(armor)) {
				logger::debug("Excluding armor due to skin");
				continue;
			}
			if (playable != armor->GetPlayable()) {
				logger::debug("Excluding armor due to not playable");
				continue;
			}
			if (ignoreTemplates && armor->templateArmor) {
				logger::debug("Excluding armor due to template");
				continue;
			}
			if (ignoreEnchantments && armor->formEnchanting) {
				logger::debug("Excluding armor due to enchantment");
				continue;
			}
			if (onlyEnchanted && !armor->formEnchanting) {
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
			logger::debug("Created new Article: " + json(article).dump());
			armorRecords[armor->GetFile()->fileName][mask_form<string, 6>(article.form)] = article;
		}
		logger::info("dummy");

		logger::info("Loaded all armors into Armor Map");
		std::ofstream out;
		out.open("YEAHHHHH.json");
		logger::info("Opened dump file");
		out << json(armorRecords).dump(4);
		logger::info("Finished dump");
	}

	void TryOutfit(Actor* actor)
	{
		std::vector<TESForm*> toEquip{
			armorRecords["Skyrim.esm"]["01B3A3"].form,
			armorRecords["Skyrim.esm"]["012E46"].form
		};
		AddItem(actor, toEquip, 1);

		ActorEquipManager* equipManager = ActorEquipManager::GetSingleton();
		for (auto& armor : toEquip)
			equipManager->EquipObject(actor, static_cast<TESObjectARMO*>(armor), nullptr, 1);
	}

	armor_record_t& GetLoadedArmors()
	{
		LoadArmors();
		return armorRecords;
	};

	//bool RegisterFuncs(VMClassRegistry* a_registry)
	//{
	//	a_registry->RegisterFunction(new NativeFunction1<StaticFunctionTag, VMResultArray<TESForm*>, Actor*>("GetOutfit", "SA_Library", SluttifyArmor::GetOutfit, a_registry));

	//	return true;
	//}
}

static const char* s_web_root_dir = "data/outfitmanager";
static const char* s_listening_address = "http://localhost:8000";

static void cb(struct mg_connection* c, int ev, void* ev_data, void*)
{
	if (ev == MG_EV_HTTP_MSG) {
		struct mg_http_message* hm = static_cast<mg_http_message*>(ev_data);

		if (mg_vcmp(&hm->uri, "/UpdateOutfit") == 0) {
			logger::info("UpdateOutfit Request received");
			auto& armors = SluttifyArmor::GetLoadedArmors();
			SluttifyArmor::TryOutfit(PlayerCharacter::GetSingleton());
			mg_http_reply(c,
				200,
				"Content-Type: application/json; charset=utf-8\r\n",
				json(armors).dump().c_str());

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
