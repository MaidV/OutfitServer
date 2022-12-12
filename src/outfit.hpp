#pragma once

#include "json.hpp"
#include <string>
#include <vector>


namespace ArticleNS
{
	struct Article
	{
		std::string name;
		std::string editorID;
		int32_t formID;
		uint32_t slots;
		RE::TESObjectARMO* form;

		Article(){};
		Article(RE::TESObjectARMO* armor);
	};
	typedef std::unordered_map<std::string, std::unordered_map<std::string, Article>> armor_record_t;

	void from_json(const nlohmann::json& j, Article& a);
	void to_json(nlohmann::json& j, const Article& a);

	void LoadArmors();
	void LoadTransforms();
	void DumpArmors();
	armor_record_t& GetLoadedArmors();
}

namespace OutfitNS
{
	struct Outfit
	{
		std::string name;
		std::vector<ArticleNS::Article> articles;
	};
	void TryOutfit(RE::Actor* actor, const char* outfit_str, bool unequip = true);
	void TryOutfit(RE::Actor* actor, const Outfit& outfit, bool unequip = true);
}

namespace TransformNS
{
	bool TransformArmor(RE::Actor* actor, RE::TESObjectARMO* armor);
}
