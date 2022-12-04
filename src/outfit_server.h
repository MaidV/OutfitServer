#pragma once

#include <vector>
#include <string>

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
}

void outfit_server(const int &port, const bool &local_only);

namespace OutfitNS
{
	struct Outfit
	{
		std::string name;
		std::vector<ArticleNS::Article> articles;
	};
}

