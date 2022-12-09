#pragma once
#include <cstdint>
#include <string>
#include <vector>

template <typename T, uint32_t L>
T mask_form(RE::TESForm* form)
{
	using std::string;
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

void run_scripts(RE::Actor* actor, std::vector<std::string> commands);

std::pair<std::string, std::string> split_string(const std::string& str);

namespace KeywordUtil
{
	RE::BGSKeyword* GetKeyword(const std::string& keywordname);
	bool HasKeywords(RE::TESObjectARMO* form, std::vector<RE::BGSKeyword*>& keywords);
}
