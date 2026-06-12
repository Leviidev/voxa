import SwiftUI

struct DMView: View {
    @EnvironmentObject var auth: AuthViewModel
    @State private var searchText = ""

    var body: some View {
        ZStack {
            Color(hex: "2B2D31").ignoresSafeArea()
            VStack(spacing: 0) {
                // Search bar
                HStack {
                    Image(systemName: "magnifyingglass")
                        .foregroundColor(Color(hex: "949BA4"))
                        .font(.system(size: 14))
                    TextField("Find or start a conversation", text: $searchText)
                        .font(.system(size: 14))
                        .foregroundColor(.white)
                }
                .padding(.horizontal, 12)
                .frame(height: 32)
                .background(Color(hex: "1E1F22"))
                .clipShape(RoundedRectangle(cornerRadius: 6))
                .padding(.horizontal, 8)
                .padding(.vertical, 8)

                Spacer()

                // Empty state
                VStack(spacing: 14) {
                    ZStack {
                        Circle()
                            .fill(Color(hex: "1E1F22"))
                            .frame(width: 72, height: 72)
                        Image(systemName: "bubble.left.and.bubble.right")
                            .font(.system(size: 28))
                            .foregroundColor(Color(hex: "5C5E66"))
                    }
                    Text("No Direct Messages")
                        .font(.system(size: 16, weight: .semibold))
                        .foregroundColor(.white)
                    Text("Direct messaging is coming soon.")
                        .font(.system(size: 14))
                        .foregroundColor(Color(hex: "949BA4"))
                        .multilineTextAlignment(.center)
                }
                .padding(.horizontal, 40)

                Spacer()
            }
        }
    }
}

struct SectionHeader: View {
    let text: String
    init(_ text: String) { self.text = text }

    var body: some View {
        HStack {
            Text(text)
                .font(.system(size: 11, weight: .semibold))
                .foregroundColor(Color(hex: "949BA4"))
                .kerning(0.3)
            Spacer()
        }
        .padding(.horizontal, 16)
        .padding(.top, 12)
        .padding(.bottom, 4)
    }
}
