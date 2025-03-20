require "json"

package = JSON.parse(File.read(File.join(__dir__, "package.json")))
folly_compiler_flags = '-DFOLLY_NO_CONFIG -DFOLLY_MOBILE=1 -DFOLLY_USE_LIBCPP=1 -Wno-comma -Wno-shorten-64-to-32'

# Check for USB feature enablement from environment variable
tsc_usb_enabled = ENV['ENABLE_TSC_USB'] == '1'

# If not enabled by environment variable, check package.json
unless tsc_usb_enabled
  # Check for tscUsbEnabled in package.json of the parent project
  # Usually this would be in the project that depends on this library
  begin
    root_package_path = File.join(File.dirname(File.dirname(__dir__)), 'package.json')
    if File.exist?(root_package_path)
      root_package = JSON.parse(File.read(root_package_path))
      tsc_usb_enabled = root_package['tscUsbEnabled'] == true
    end
  rescue
    # Ignore errors reading the parent package.json
  end
end

tsc_compiler_flags = tsc_usb_enabled ? "-DENABLE_TSC_USB=1" : ""

Pod::Spec.new do |s|
  s.name         = "react-native-tsc-printer"
  s.version      = package["version"]
  s.summary      = package["description"]
  s.homepage     = package["homepage"]
  s.license      = package["license"]
  s.authors      = package["author"]

  s.platforms    = { :ios => min_ios_version_supported }
  s.source       = { :git => "https://github.com/mybigday/react-native-tsc-printer.git", :tag => "#{s.version}" }

  s.source_files = "ios/**/*.{h,m,mm}"

  s.compiler_flags = tsc_compiler_flags

  if tsc_usb_enabled
    s.frameworks = "CoreBluetooth", "UIKit", "ExternalAccessory"
  else
    s.frameworks = "CoreBluetooth", "UIKit"
  end

  s.pod_target_xcconfig = {
    "GCC_PREPROCESSOR_DEFINITIONS" => tsc_usb_enabled ? "$(inherited) ENABLE_TSC_USB=1" : "$(inherited)"
  }

  # Use install_modules_dependencies helper to install the dependencies if React Native version >=0.71.0.
  # See https://github.com/facebook/react-native/blob/febf6b7f33fdb4904669f99d795eba4c0f95d7bf/scripts/cocoapods/new_architecture.rb#L79.
  if respond_to?(:install_modules_dependencies, true)
    install_modules_dependencies(s)
  else
    s.dependency "React-Core"

    # Don't install the dependencies when we run `pod install` in the old architecture.
    if ENV['RCT_NEW_ARCH_ENABLED'] == '1' then
      s.compiler_flags = "#{tsc_compiler_flags} #{folly_compiler_flags} -DRCT_NEW_ARCH_ENABLED=1"
      s.pod_target_xcconfig    = {
          "HEADER_SEARCH_PATHS" => "\"$(PODS_ROOT)/boost\"",
          "OTHER_CPLUSPLUSFLAGS" => "-DFOLLY_NO_CONFIG -DFOLLY_MOBILE=1 -DFOLLY_USE_LIBCPP=1 #{tsc_compiler_flags}",
          "CLANG_CXX_LANGUAGE_STANDARD" => "c++17",
          "GCC_PREPROCESSOR_DEFINITIONS" => tsc_usb_enabled ? "$(inherited) ENABLE_TSC_USB=1" : "$(inherited)"
      }
      s.dependency "React-Codegen"
      s.dependency "RCT-Folly"
      s.dependency "RCTRequired"
      s.dependency "RCTTypeSafety"
      s.dependency "ReactCommon/turbomodule/core"
    end
  end
end
