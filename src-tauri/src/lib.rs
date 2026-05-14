use std::process::Command;
use std::env;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  // HYPRLAND / WAYLAND FIX: Disable the DMA-BUF renderer which causes Protocol Error 71 on wlroots compositors
  env::set_var("WEBKIT_DISABLE_DMABUF_RENDERER", "1");

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

      // Wait for the backend to bind to port 8000 to prevent Webview "Connection refused" errors
      let mut attempts = 0;
      while attempts < 50 {
          if std::net::TcpStream::connect("127.0.0.1:8000").is_ok() {
              break;
          }
          std::thread::sleep(std::time::Duration::from_millis(100));
          attempts += 1;
      }

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