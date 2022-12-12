#include "outfit.hpp"
#include "outfit_server.h"
#include <thread>

#include <Windows.h>

namespace Plugin
{
	using namespace std::literals;

	inline constexpr REL::Version VERSION{
		0,
		0,
		1,
	};

	inline constexpr auto NAME = "OutfitServer";
}

namespace Events
{
	void Register();
}

extern "C" DLLEXPORT constinit auto SKSEPlugin_Version = []() {
	SKSE::PluginVersionData v;

	v.PluginVersion(Plugin::VERSION);
	v.PluginName(Plugin::NAME);

	v.UsesAddressLibrary(true);
	v.CompatibleVersions({ SKSE::RUNTIME_LATEST });

	return v;
}();

static inline bool TransformArmor(RE::StaticFunctionTag*, RE::Actor* actor, RE::TESForm* armor)
{
	return TransformNS::TransformArmor(actor, static_cast<RE::TESObjectARMO*>(armor));
}

static inline void DumpArmors(RE::StaticFunctionTag*) { ArticleNS::DumpArmors(); };

extern "C" DLLEXPORT bool SKSEAPI SKSEPlugin_Load(const SKSE::LoadInterface* a_skse)
{
	auto path = logger::log_directory();
	if (!path) {
		return false;
	}

	*path /= "OutfitServer.log"sv;
	auto sink = std::make_shared<spdlog::sinks::basic_file_sink_mt>(path->string(), true);
	auto log = std::make_shared<spdlog::logger>("global log"s, std::move(sink));

	log->set_level(spdlog::level::info);
	log->flush_on(spdlog::level::info);

	spdlog::set_default_logger(std::move(log));
	spdlog::set_pattern("[%^%l%$] %v"s);

	logger::info("{} v{}.{}.{}", Plugin::NAME, Plugin::VERSION[0], Plugin::VERSION[1], Plugin::VERSION[2]);

	SKSE::Init(a_skse);
	// Events::Register();

	char buff[100];
	const char config_file[] = "data/skse/plugins/outfitserver.ini";
	GetPrivateProfileString("General", "bEnabled", "1", buff, 100, config_file);
	bool bEnabled = atoi(buff);
	logger::info("    bEnabled = {}", buff);

	GetPrivateProfileString("General", "iPort", "8000", buff, 100, config_file);
	int iPort = atoi(buff);
	logger::info("    iPort = {}", buff);

	GetPrivateProfileString("General", "bLocalOnly", "1", buff, 100, config_file);
	bool bLocalOnly = atoi(buff);
	logger::info("    bLocalOnly = {}", buff);

	if (bEnabled)
		std::thread(outfit_server, iPort, bLocalOnly).detach();

	auto RegisterPapyrusFuncs = [](RE::BSScript::IVirtualMachine* a_vm) -> bool {
		a_vm->RegisterFunction("TransformArmor", "OutfitServer", TransformArmor);
		a_vm->RegisterFunction("DumpArmors", "OutfitServer", DumpArmors);
		return true;
	};

	auto papyrus = SKSE::GetPapyrusInterface();
	if (!papyrus->Register(RegisterPapyrusFuncs)) {
		logger::critical("Failed to register papyrus callback");
		return false;
	}

	return true;
}
