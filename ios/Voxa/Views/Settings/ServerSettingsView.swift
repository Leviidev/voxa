import SwiftUI

struct ServerSettingsView: View {
    let server: VoxaServer
    @EnvironmentObject var servers: ServersViewModel
    @EnvironmentObject var auth: AuthViewModel
    @Environment(\.dismiss) var dismiss

    @State private var name = ""
    @State private var iconUrl = ""
    @State private var isSaving = false
    @State private var showDeleteConfirm = false
    @State private var isDeleting = false
    @State private var error: String?
    @State private var successMsg: String?

    var body: some View {
        NavigationView {
            ZStack {
                Color(hex: "111214").ignoresSafeArea()

                ScrollView {
                    VStack(spacing: 20) {

                        // Server icon preview
                        ZStack {
                            RoundedRectangle(cornerRadius: 24)
                                .fill(server.accentColor)
                                .frame(width: 80, height: 80)
                            Text(server.acronym)
                                .font(.system(size: 28, weight: .bold))
                                .foregroundColor(.white)
                        }
                        .padding(.top, 24)

                        // Fields
                        VStack(spacing: 16) {
                            settingField(label: "SERVER NAME", placeholder: server.name, text: $name)
                            settingField(label: "ICON URL (optional)", placeholder: "https://…", text: $iconUrl)
                        }
                        .padding(.horizontal, 20)

                        // Save button
                        Button(action: saveChanges) {
                            ZStack {
                                RoundedRectangle(cornerRadius: 14)
                                    .fill(name.isEmpty && iconUrl.isEmpty
                                          ? Color.white.opacity(0.08)
                                          : Color(hex: "E53935"))
                                    .frame(height: 52)
                                if isSaving {
                                    ProgressView().tint(.white)
                                } else {
                                    Text("Save Changes")
                                        .font(.system(size: 15, weight: .bold))
                                        .foregroundColor(name.isEmpty && iconUrl.isEmpty
                                                         ? Color(hex: "5C5E66") : .white)
                                }
                            }
                        }
                        .disabled((name.isEmpty && iconUrl.isEmpty) || isSaving)
                        .padding(.horizontal, 20)

                        if let msg = successMsg {
                            Text(msg)
                                .font(.system(size: 13))
                                .foregroundColor(Color(hex: "23a55a"))
                                .padding(.horizontal, 20)
                        }
                        if let err = error {
                            Text(err)
                                .font(.system(size: 13))
                                .foregroundColor(Color(hex: "f23f43"))
                                .padding(.horizontal, 20)
                        }

                        Divider()
                            .background(Color.white.opacity(0.06))
                            .padding(.horizontal, 20)
                            .padding(.top, 8)

                        // Danger zone
                        VStack(alignment: .leading, spacing: 8) {
                            Text("DANGER ZONE")
                                .font(.system(size: 10, weight: .bold))
                                .foregroundColor(Color(hex: "f23f43"))
                                .kerning(0.8)
                                .padding(.horizontal, 20)

                            Button(action: { showDeleteConfirm = true }) {
                                HStack {
                                    Image(systemName: "trash.fill")
                                        .font(.system(size: 14))
                                    Text("Delete Server")
                                        .font(.system(size: 15, weight: .semibold))
                                    Spacer()
                                }
                                .foregroundColor(Color(hex: "f23f43"))
                                .padding(.horizontal, 20)
                                .padding(.vertical, 14)
                                .background(Color(hex: "f23f43").opacity(0.08))
                                .clipShape(RoundedRectangle(cornerRadius: 12))
                                .padding(.horizontal, 20)
                            }
                        }

                        Spacer(minLength: 40)
                    }
                }
            }
            .navigationTitle("Server Settings")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Cancel") { dismiss() }
                        .foregroundColor(Color(hex: "E53935"))
                }
            }
            .alert("Delete Server?", isPresented: $showDeleteConfirm) {
                Button("Delete", role: .destructive) { deleteServer() }
                Button("Cancel", role: .cancel) {}
            } message: {
                Text("This permanently deletes \"\(server.name)\" and all its channels. This cannot be undone.")
            }
        }
        .preferredColorScheme(.dark)
        .onAppear {
            name = ""
            iconUrl = server.iconUrl ?? ""
        }
    }

    @ViewBuilder
    private func settingField(label: String, placeholder: String, text: Binding<String>) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(label)
                .font(.system(size: 10, weight: .bold))
                .foregroundColor(Color(hex: "6b7280"))
                .kerning(0.8)
            TextField(placeholder, text: text)
                .autocapitalization(.none)
                .disableAutocorrection(true)
                .padding(.horizontal, 14)
                .frame(height: 48)
                .background(Color.white.opacity(0.05))
                .clipShape(RoundedRectangle(cornerRadius: 12))
                .overlay(RoundedRectangle(cornerRadius: 12)
                    .stroke(Color.white.opacity(0.1), lineWidth: 1))
                .foregroundColor(.white)
        }
    }

    private func saveChanges() {
        isSaving = true
        error = nil
        successMsg = nil
        Task {
            do {
                let newName = name.trimmingCharacters(in: .whitespaces)
                let newIcon = iconUrl.trimmingCharacters(in: .whitespaces)
                try await APIClient.shared.updateServer(
                    id: server.id,
                    name: newName.isEmpty ? nil : newName,
                    iconUrl: newIcon.isEmpty ? nil : newIcon
                )
                await servers.load()
                successMsg = "Changes saved!"
                name = ""
            } catch {
                self.error = error.localizedDescription
            }
            isSaving = false
        }
    }

    private func deleteServer() {
        isDeleting = true
        Task {
            await servers.deleteServer(server)
            dismiss()
        }
    }
}
