use std::process::Command;
use std::env;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .setup(|app| {
      // Get the absolute path to the launch.sh script which starts the python server
      let current_exe = env::current_exe().unwrap();
      // Executable is typically in src-tauri/target/debug/ or src-tauri/target/release/
      // We'll just run launch.sh from the project root. For simplicity, we assume
      // the working directory is the project root when running via `npm run tauri dev`.
      // If we want it to be robust in production, we should bundle the python app,
      // but for this ArchLinux project, we'll spawn it relative to the current dir.
      let launch_script = "./launch.sh";
      
      let mut child = Command::new("bash")
          .arg(launch_script)
          .spawn()
          .expect("Failed to start GNSS backend server");

      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}