import { DataTypes } from "sequelize";
import { sequelize } from "../configs/sequelize.configs.js";
import { User } from "./user.models.js";

export const Thread = sequelize.define(
  "Thread",
  {
    threadId: {
      type: DataTypes.STRING,
      primaryKey: true,
      allowNull: false,
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "Untitled",
    },
    isPinned: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    publicId: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    instructionsUrl: {
      type: DataTypes.STRING(2048), // Use longer limit for potentially long URLs
      allowNull: true,
    },
  },
  {
    tableName: "threads",
    timestamps: true, // creates createdAt, updatedAt
    indexes: [
      {
        fields: ["userId"],
      },
    ],
  }
);

// Define Associations
User.hasMany(Thread, { foreignKey: "userId", as: "threads" });
Thread.belongsTo(User, { foreignKey: "userId", as: "user" });

