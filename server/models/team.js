module.exports = (sequelize, DataTypes) => {
  const Team = sequelize.define(
    "Team",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      name: {
        type: DataTypes.STRING(255),
        allowNull: false,
        unique: true,
        validate: {
          notEmpty: true,
        },
        comment: "Team name (e.g., Arsenal, Chelsea)",
      },
    },
    {
      tableName: "teams",
      timestamps: false,
    },
  );

  Team.associate = (models) => {
    // A team can be home team in many matches
    Team.hasMany(models.Match, {
      foreignKey: "home_team_id",
      as: "homeMatches",
    });

    // A team can be away team in many matches
    Team.hasMany(models.Match, {
      foreignKey: "away_team_id",
      as: "awayMatches",
    });

    // A team can be in H2H history as home team
    Team.hasMany(models.H2HHistory, {
      foreignKey: "home_team_id",
      as: "h2hHome",
    });

    // A team can be in H2H history as away team
    Team.hasMany(models.H2HHistory, {
      foreignKey: "away_team_id",
      as: "h2hAway",
    });
  };

  return Team;
};
