import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, ScrollView } from "react-native";
import clsx from "clsx";
import { z } from "zod";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "expo-router";

const authSchema = z
  .object({
    name: z.string().min(2, "Name must be at least 2 characters").optional(),
    email: z.string().email("Invalid email address"),
    password: z.string().min(6, "Password must be at least 6 characters"),
    confirmPassword: z.string().optional(),
  })
  .refine(
    (data) => {
      if (data.confirmPassword !== undefined) {
        return data.password === data.confirmPassword;
      }
      return true;
    },
    { message: "Passwords don't match", path: ["confirmPassword"] }
  );

export default function AuthScreen() {
  const { signIn, signUp, resetPassword } = useAuth();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<"signin" | "signup">("signin");
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: "" }));
  };

  const validateForm = (isSignUp = false) => {
    try {
      const data = isSignUp ? formData : { email: formData.email, password: formData.password };
      authSchema.parse(data);
      setErrors({});
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path[0]) newErrors[err.path[0] as string] = err.message;
        });
        setErrors(newErrors);
      }
      return false;
    }
  };

  const handleSignIn = async () => {
    if (!validateForm(false)) return;
    setLoading(true);
    await signIn(formData.email, formData.password);
    router.push('/leaderboard')
    setLoading(false);
  };

  const handleSignUp = async () => {
    if (!validateForm(true)) return;
    setLoading(true);
    await signUp(formData.email, formData.password, { display_name: formData.name });
    setLoading(false);
    setActiveTab("signin");
  };

  const handleForgotPassword = async () => {
    if (!formData.email) {
      setErrors({ email: "Email is required for password reset" });
      return;
    }
    setLoading(true);
    await resetPassword(formData.email);
    setLoading(false);
    setShowForgotPassword(false);
  };

  return (
    <ScrollView contentContainerStyle={{ flexGrow: 1 }} className="bg-white">
      <View className="flex-1 min-h-screen items-center justify-center px-4 py-10">
        <View className="w-full max-w-md">

          <View className="items-center mb-8">
            <Text className="text-3xl font-black text-black font-cooper">TOUCH GRASS</Text>
            <Text className="text-gray-500 text-base mt-2 font-typewriter text-center">
              Join the community and start your journey
            </Text>
          </View>

          {!showForgotPassword ? (
            <>
              {/* Tabs */}
              <View className="flex-row justify-center mb-6 bg-gray-100 rounded-xl p-1">
                <TouchableOpacity
                  onPress={() => setActiveTab("signin")}
                  className={clsx(
                    "flex-1 py-2 rounded-xl",
                    activeTab === "signin" && "bg-white shadow"
                  )}
                >
                  <Text
                    className={clsx(
                      "text-center font-typewriter font-medium",
                      activeTab === "signin" ? "text-black" : "text-gray-500"
                    )}
                  >
                    Sign In
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setActiveTab("signup")}
                  className={clsx(
                    "flex-1 py-2 rounded-xl",
                    activeTab === "signup" && "bg-white shadow"
                  )}
                >
                  <Text
                    className={clsx(
                      "text-center font-typewriter font-medium",
                      activeTab === "signup" ? "text-black" : "text-gray-500"
                    )}
                  >
                    Sign Up
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Form box */}
              <View className="border border-primary rounded-2xl p-5 shadow-sm">
                <Text className="text-xl font-bold font-cooper mb-1">SIGN {activeTab === "signin" ? "IN" : "UP"}</Text>
                <Text className="text-gray-500 mb-5 font-typewriter text-sm">
                  {activeTab === "signin"
                    ? "Enter your credentials to access your account"
                    : "Sign up to join the Touch Grass community"}
                </Text>

                {/* Fields */}
                {activeTab === "signup" && (
                  <View className="mb-4">
                    <Text className="text-gray-700 mb-1 font-typewriter">Name</Text>
                    <TextInput
                      className="border border-gray-300 rounded-xl px-4 py-3 font-typewriter"
                      placeholder="Your name"
                      value={formData.name}
                      onChangeText={(t) => handleChange("name", t)}
                    />
                    {errors.name && <Text className="text-red-500 text-xs mt-1">{errors.name}</Text>}
                  </View>
                )}

                <View className="mb-4">
                  <Text className="text-gray-700 mb-1 font-typewriter">Email</Text>
                  <TextInput
                    className="border border-gray-300 rounded-xl px-4 py-3 font-typewriter"
                    placeholder="you@example.com"
                    value={formData.email}
                    onChangeText={(t) => handleChange("email", t)}
                  />
                  {errors.email && <Text className="text-red-500 text-xs mt-1">{errors.email}</Text>}
                </View>

                <View className="mb-4">
                  <Text className="text-gray-700 mb-1 font-typewriter">Password</Text>
                  <TextInput
                    className="border border-gray-300 rounded-xl px-4 py-3 font-typewriter"
                    placeholder="••••••••"
                    secureTextEntry
                    value={formData.password}
                    onChangeText={(t) => handleChange("password", t)}
                  />
                  {errors.password && <Text className="text-red-500 text-xs mt-1">{errors.password}</Text>}
                </View>

                {activeTab === "signup" && (
                  <View className="mb-4">
                    <Text className="text-gray-700 mb-1 font-typewriter">Confirm Password</Text>
                    <TextInput
                      className="border border-gray-300 rounded-xl px-4 py-3 font-typewriter"
                      placeholder="••••••••"
                      secureTextEntry
                      value={formData.confirmPassword}
                      onChangeText={(t) => handleChange("confirmPassword", t)}
                    />
                    {errors.confirmPassword && <Text className="text-red-500 text-xs mt-1">{errors.confirmPassword}</Text>}
                  </View>
                )}

                {/* Button */}
                <TouchableOpacity
                  disabled={loading}
                  onPress={activeTab === "signin" ? handleSignIn : handleSignUp}
                  className="bg-primary py-3 rounded-xl mt-2"
                >
                  {loading ? (
                    <ActivityIndicator color="#000" />
                  ) : (
                    <Text className="text-center font-typewriter font-semibold text-black">
                      {activeTab === "signin" ? "Sign In" : "Create Account"}
                    </Text>
                  )}
                </TouchableOpacity>

                {activeTab === "signin" && (
                  <TouchableOpacity onPress={() => setShowForgotPassword(true)}>
                    <Text className="text-center text-primary mt-4 font-typewriter">
                      Forgot your password?
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </>
          ) : (
            <View className="border border-primary rounded-2xl p-5 shadow-sm">
              <Text className="text-xl font-bold font-cooper mb-1 text-center">RESET PASSWORD</Text>
              <Text className="text-gray-500 mb-4 text-center font-typewriter text-sm">
                Enter your email to receive a password reset link
              </Text>

              <TextInput
                className="border border-gray-300 rounded-xl px-4 py-3 font-typewriter"
                placeholder="you@example.com"
                value={formData.email}
                onChangeText={(t) => handleChange("email", t)}
              />
              {errors.email && <Text className="text-red-500 text-xs mt-1">{errors.email}</Text>}

              <TouchableOpacity
                disabled={loading}
                onPress={handleForgotPassword}
                className="bg-primary py-3 rounded-xl mt-6"
              >
                {loading ? (
                  <ActivityIndicator color="#000" />
                ) : (
                  <Text className="text-center font-typewriter font-semibold text-black">
                    Send Reset Email
                  </Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity onPress={() => setShowForgotPassword(false)}>
                <Text className="text-center text-primary mt-4 font-typewriter">Back to Sign In</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </ScrollView>
  );
}
