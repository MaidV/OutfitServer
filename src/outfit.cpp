#include <string>
#include <unordered_map>
#include <filesystem>

#include "json.hpp"
#include "outfit.hpp"
#include "utils.hpp"


using nlohmann::json;
using std::string;
using std::unordered_map;
using std::vector;
using namespace RE;

namespace ArticleNS
{
	Article::Article(TESObjectARMO* armor) :
		name(armor->GetFullName()),
		editorID(armor->GetFormEditorID()),
		formID(mask_form<int32_t, 6>(armor)),
		slots(static_cast<int32_t>(armor->GetSlotMask())),
		form(armor){};


	armor_record_t armor_map;

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
			KeywordUtil::GetKeyword("zad_InventoryDevice"),
			KeywordUtil::GetKeyword("zad_Lockable")
		};

		logger::info("LoadArmors: Looping through armors");
		BSTArray<TESForm*>& armors = data_handler->GetFormArray(TESObjectARMO::FORMTYPE);
		for (TESForm* armorform : armors) {
			TESObjectARMO* armor = static_cast<TESObjectARMO*>(armorform);
			logger::debug("Checking armor {}"sv, +armor->GetFullName());
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
			if (KeywordUtil::HasKeywords(armor, badKeywords)) {
				logger::debug("Excluding armor due to having bad keywords");
				continue;
			}
			if (!strlen(armor->GetFullName())) {
				logger::debug("Excluding armor due to not having a name");
				continue;
			}
			logger::debug("Adding new armor to map: {}"sv, armor->GetFullName());

			ArticleNS::Article article(armor);
			logger::debug("Created new Article: {}"sv, json(article).dump(-1, ' ', false, json::error_handler_t::ignore));
			armor_map[armor->GetFile()->fileName][mask_form<string, 6>(article.form)] = article;
		}

		logger::info("Loaded all armors into Armor Map");
		std::ofstream out;
		out.open("data/skse/plugins/transform armor/AllArmors_dump.json");
		logger::info("Opened dump file");
		out << json(armor_map).dump(4, ' ', false, json::error_handler_t::ignore);
		logger::info("Finished dump");
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
		logger::info("Article: {} {}"sv, mod, formID);
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

namespace TransformNS
{
	typedef unordered_map<int32_t, vector<ArticleNS::Article>> transform_target_t;
	unordered_map<string, transform_target_t> transform_map;

	void from_json(const json& j, transform_target_t& a);
	void to_json(json& j, const transform_target_t& a);

	void LoadTransforms()
	{
		if (!transform_map.empty())
			return;
		
		const string basepath = "data/skse/plugins/transform armor";
    	for (const auto & entry : std::filesystem::directory_iterator(basepath)) {
			const auto filename = entry.path().string();
			if (!filename.ends_with(".json"))
				continue;
			spdlog::info("Parsing transform file: " + filename);
			try {
				std::ifstream ifs(filename);
				auto parsed = json::parse(ifs);
				for (json::iterator source = parsed.begin(); source != parsed.end(); ++source) {
					transform_target_t tmp;
					from_json(source.value(), tmp);
					transform_map[source.key()] = tmp;
				}
			} catch(...) {
				spdlog::warn("Unable to parse " + filename);
			}
		}
		spdlog::info("Loaded transforms");
	};

	void TransformArmor(Actor* actor, TESObjectARMO* armor)
	{
		ArticleNS::LoadArmors();
		LoadTransforms();

		string file = armor->GetFile()->fileName;
		string form = mask_form<string, 6>(armor);
		string key = file + "|" + form;

		if (!transform_map.count(key)) {
			spdlog::warn("(" + file + ", " + form + ") not in Transform map");
			return;
		}

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

		vector<ArticleNS::Article> to_equip;
		OutfitNS::Outfit outfit;
		outfit.name = key;
		for (const auto& [_, articles] : transform_map.at(key)) {
			if (articles.empty())
				continue;

			outfit.articles.push_back(articles[rand() % articles.size()]);
		}

		OutfitNS::TryOutfit(actor, outfit, false);
	}

	void from_json(const json& j, transform_target_t& a)
	{
		const auto& armor_map = ArticleNS::GetLoadedArmors();
		for (json::const_iterator it = j.cbegin(); it != j.cend(); ++it) {
			int32_t i_slot = atoi(it.key().c_str());
			a[i_slot] = {};

			vector<string> tmp = it.value().get<vector<string>>();
			for (auto formpair : tmp) {
				auto [mod, formID] = split_string(formpair);
				a[i_slot].push_back(armor_map.at(mod).at(formID));
			}
		}
	}
}

namespace OutfitNS
{
	std::unordered_map<string, Outfit> outfit_map;

	void from_json(const json& j, Outfit& o);
	void to_json(json& j, const Outfit& o);

	void TryOutfit(Actor* actor, const OutfitNS::Outfit& outfit, bool unequip)
	{
		ActorEquipManager* equip_manager = ActorEquipManager::GetSingleton();

		if (unequip)
			run_scripts(actor, { "unequipall" });

		std::vector<TESForm*> to_equip;
		to_equip.reserve(outfit.articles.size());
		for (const ArticleNS::Article& article : outfit.articles) {
			to_equip.push_back(article.form);
		}
		ArticleNS::AddItem(actor, to_equip, 1);

		for (auto& armor : to_equip)
			equip_manager->EquipObject(actor, static_cast<TESObjectARMO*>(armor), nullptr, 1);
	}

	void TryOutfit(Actor* actor, const char* outfit_str, bool unequip)
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
