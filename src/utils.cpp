#include "utils.hpp"

#include <mutex>

using namespace RE;
using std::string;
using std::vector;

namespace KeywordUtil
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
		logger::info("{}"sv, script->GetCommand());
		script->CompileAndRun(actor);
	}
	delete script;
}

std::pair<string, string> split_string(const string& str)
{
	auto index = str.find("|");
	string mod = str.substr(0, index);
	string id = str.substr(index, str.length() - index);
	return std::make_pair(mod, id);
};